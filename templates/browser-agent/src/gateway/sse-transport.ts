/**
 * SSE + HTTP Transport for the web gateway.
 *
 * Replaces the WebSocket handler. Two HTTP endpoints:
 *   GET  /api/events?token=xxx  → opens an SSE stream (server→client push + response delivery)
 *   POST /api/rpc?token=xxx      → sends an RPC request (client→server)
 *
 * Each SSE client gets its own RPCServer instance (matching the previous
 * per-connection WebSocket model). POST /api/rpc carries the clientId to
 * route the message into the correct RPCServer.
 */

import type { IncomingMessage, Server, ServerResponse } from "http";
import { randomUUID, timingSafeEqual } from "crypto";
import { RPCServer, type Transport } from "@dyyz1993/rpc-core";
import { registerAllHandlers } from "../shared/register-all-handlers";
import { createLogger } from "../shared/lib/logger";

const log = createLogger("gateway");

function safeEqual(a: string, b: string): boolean {
	const bufA = Buffer.from(a);
	const bufB = Buffer.from(b);
	if (bufA.length !== bufB.length) return false;
	return timingSafeEqual(bufA as unknown as Buffer, bufB as unknown as Buffer);
}

export interface SseHandlerDeps {
	config: { readonly port: number; readonly authToken: string; readonly maxUploadSize: number };
}

interface SseClient {
	id: string;
	res: ServerResponse;
	rpcServer: RPCServer;
	transport: Transport;
	messageHandlers: Set<(msg: unknown) => void>;
	cleanup: () => void;
}

export interface SseHandler {
	clients: Map<string, SseClient>;
	handleSseConnect: (req: IncomingMessage, res: ServerResponse) => void;
	handleRpcPost: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
	close: () => void;
}

/**
 * Build a Transport that bridges an SSE response stream (for server→client)
 * with the accumulated message handlers (fed by POST /api/rpc).
 */
function createSseTransport(client: SseClient): Transport {
	const send = async (message: unknown): Promise<void> => {
		if (client.res.writableEnded) return;
		client.res.write(`data: ${JSON.stringify(message)}\n\n`);
	};

	const onMessage = (handler: (msg: unknown) => void): (() => void) => {
		client.messageHandlers.add(handler);
		return () => {
			client.messageHandlers.delete(handler);
		};
	};

	const onError = (): (() => void) => {
		return () => {};
	};

	const onDisconnect = (handler: () => void): (() => void) => {
		// onClose is wired in handleSseConnect; expose a registration stub
		client.cleanup = handler;
		return () => {
			if (client.cleanup === handler) client.cleanup = () => {};
		};
	};

	return {
		send,
		onMessage,
		onError,
		onDisconnect,
		isConnected: () => !client.res.writableEnded,
		close: () => {},
	};
}

export function createSseHandler(_httpServer: Server, deps: SseHandlerDeps): SseHandler {
	void deps; // deps kept for API symmetry with createWsHandler; config is enforced by http-routes auth
	const clients = new Map<string, SseClient>();

	function handleSseConnect(req: IncomingMessage, res: ServerResponse): void {
		// SSE response headers — disable proxy buffering for real-time streaming
		res.writeHead(200, {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache, no-transform",
			Connection: "keep-alive",
			"X-Accel-Buffering": "no",
			"Access-Control-Allow-Origin": "*",
		});

		const id = randomUUID();
		const messageHandlers = new Set<(msg: unknown) => void>();

		const client: SseClient = {
			id,
			res,
			messageHandlers,
			rpcServer: undefined as unknown as RPCServer,
			transport: undefined as unknown as Transport,
			cleanup: () => {},
		};

		client.transport = createSseTransport(client);
		client.rpcServer = new RPCServer(client.transport);
		registerAllHandlers(client.rpcServer, { platform: "web" });

		clients.set(id, client);

		// Send the clientId as the first event so the client can use it for POSTs
		res.write(`event: ready\ndata: ${JSON.stringify({ clientId: id })}\n\n`);

		// Heartbeat every 25s to keep proxies from timing out
		const heartbeat = setInterval(() => {
			if (res.writableEnded) return;
			res.write(": ping\n\n");
		}, 25000);

		log.info("SSE client connected", { id, total: clients.size });

		const onClose = (): void => {
			clearInterval(heartbeat);
			clients.delete(id);
			client.cleanup();
			client.rpcServer.close();
			log.info("SSE client disconnected", { id, total: clients.size });
		};

		req.on("close", onClose);
		req.on("error", onClose);
	}

	async function handleRpcPost(req: IncomingMessage, res: ServerResponse): Promise<void> {
		const url = req.url ? new URL(req.url, "http://localhost") : null;
		const clientId = url?.searchParams.get("clientId");

		if (!clientId) {
			res.writeHead(400, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: "Missing clientId" }));
			return;
		}

		const client = clients.get(clientId);
		if (!client) {
			res.writeHead(404, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: "Unknown clientId (SSE not connected)" }));
			return;
		}

		// Read JSON body
		let body = "";
		for await (const chunk of req) {
			body += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
		}

		let message: unknown;
		try {
			message = JSON.parse(body);
		} catch {
			res.writeHead(400, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: "Invalid JSON" }));
			return;
		}

		// Acknowledge receipt — the actual RPC response will arrive via the SSE stream
		res.writeHead(202, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ accepted: true }));

		// Route the message into the client's RPCServer via its transport handlers
		for (const handler of client.messageHandlers) {
			handler(message);
		}
	}

	return {
		clients,
		handleSseConnect,
		handleRpcPost,
		close: (): void => {
			for (const client of clients.values()) {
				client.rpcServer.close();
				if (!client.res.writableEnded) {
					client.res.end();
				}
			}
			clients.clear();
		},
	};
}

export function verifyToken(req: IncomingMessage, authToken: string): boolean {
	const auth = req.headers["authorization"];
	if (auth && safeEqual(auth, `Bearer ${authToken}`)) return true;

	if (req.url) {
		try {
			const url = new URL(req.url, "http://localhost");
			const token = url.searchParams.get("token");
			if (token && safeEqual(token, authToken)) return true;
		} catch {
			/* invalid URL */
		}
	}
	return false;
}
