/**
 * WebSocket handler for the web gateway.
 * Handles WS connections, auth, and bridges to RPCServer.
 */

import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { timingSafeEqual } from "crypto";
import { RPCServer, type Transport } from "@dyyz1993/rpc-core";
import { registerAllHandlers } from "../shared/register-all-handlers";
import { createLogger } from "../shared/lib/logger";

const log = createLogger("gateway");

function safeEqual(a: string, b: string): boolean {
	const bufA = Buffer.from(a);
	const bufB = Buffer.from(b);
	if (bufA.length !== bufB.length) return false;
		return timingSafeEqual(bufA as any, bufB as any);
}

export interface WsHandlerDeps {
	config: { readonly port: number; readonly authToken: string; readonly maxUploadSize: number };
}

export function createWsHandler(httpServer: Server, deps: WsHandlerDeps): WebSocketServer {
	const { config: cfg } = deps;
	const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

	wss.on("connection", (ws: WebSocket, req) => {
		// Token 验证（header 优先，query fallback）
		const url = req.url ? new URL(req.url, "http://localhost") : null;
		const headerToken = (req.headers["sec-websocket-protocol"] as string) || undefined;
		const queryToken = url?.searchParams.get("token");
		const token = headerToken || queryToken;
		if (!safeEqual(token || "", cfg.authToken)) {
			log.warn("Connection rejected: invalid token", {
				providedPrefix: token ? `${token.substring(0, 4)}***` : "(none)",
			});
			ws.close(4001, "Unauthorized");
			return;
		}

		log.info("Client connected", { total: wss.clients.size });

		const PING_INTERVAL = 30000;
		let pongReceived = true;
		const pingTimer = setInterval(() => {
			if (ws.readyState !== WebSocket.OPEN) {
				clearInterval(pingTimer);
				return;
			}
			if (!pongReceived) {
				log.warn("Client heartbeat timeout, closing connection");
				clearInterval(pingTimer);
				ws.terminate();
				return;
			}
			pongReceived = false;
			ws.ping();
		}, PING_INTERVAL);

		ws.on("pong", () => {
			pongReceived = true;
		});

		const wsTransport = {
			send: async (message: unknown): Promise<void> => {
				if (ws.readyState === WebSocket.OPEN) {
					ws.send(JSON.stringify(message));
				}
			},
			onMessage: (handler: (message: unknown) => void): (() => void) => {
				const listener = (data: Buffer) => {
					try {
						const msg = JSON.parse(data.toString());
						handler(msg);
					} catch (err) {
						log.error("Failed to parse message", {
							error: err instanceof Error ? err.message : String(err),
						});
					}
				};
				ws.on("message", listener);
				return () => ws.off("message", listener);
			},
			onError: (): (() => void) => {
				return () => {};
			},
			onDisconnect: (): (() => void) => {
				return () => {};
			},
			isConnected: (): boolean => ws.readyState === WebSocket.OPEN,
			close: (): void => {},
		};

		const rpcServer = new RPCServer(wsTransport as Transport);

		// 自动导入并注册所有 handlers
		registerAllHandlers(rpcServer, { platform: "web" });

		ws.on("close", () => {
			if (pingTimer) clearInterval(pingTimer);
			log.info("Client disconnected", { total: wss.clients.size });
			rpcServer.close();
		});

		ws.on("error", (err: Error) => {
			log.error("Client error", { error: err.message });
		});
	});

	return wss;
}
