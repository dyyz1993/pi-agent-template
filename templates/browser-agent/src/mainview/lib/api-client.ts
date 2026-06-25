import { createTypedClient, IPCTransport } from "@dyyz1993/rpc-core";
import type {
	TypedClient,
	MethodParams,
	MethodResult,
	EventPayload,
	EventMetadata,
	Transport,
} from "@dyyz1993/rpc-core";
import type { RPCMethods, RPCEvents } from "../../shared/rpc-schema";
import { rpcCache, CACHEABLE_METHODS } from "./rpc-cache";
import { networkBus } from "./network-bus";

/**
 * Token 来源优先级：
 * 1. Vite 环境变量 VITE_AUTH_TOKEN（从 .env 注入）
 * 2. URL query ?token=xxx（部署时注入）
 * 3. localStorage "rpc-auth-token"
 * 4. 默认值（开发备用）
 */
function resolveAuthToken(): string {
	if (typeof window !== "undefined") {
		// Vite 注入的环境变量（来自 .env 的 VITE_AUTH_TOKEN）
		const viteToken =
			typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_AUTH_TOKEN;
		if (viteToken) return viteToken;

		const fromQuery = new URLSearchParams(window.location.search).get("token");
		if (fromQuery) return fromQuery;
		const fromStorage = localStorage.getItem("rpc-auth-token");
		if (fromStorage) return fromStorage;
	}
	return "pi-agent-template-token";
}

const AUTH_TOKEN = resolveAuthToken();

/**
 * Browser SSE Transport — bridges EventSource (server→client) and
 * fetch POST (client→server) into the rpc-core Transport interface.
 *
 * - send():    POST /api/rpc with the message JSON; response arrives via SSE.
 * - onMessage: EventSource "data:" frames parsed and forwarded to handlers.
 *
 * The SSE stream delivers the clientId in a "ready" event; subsequent POSTs
 * carry ?clientId= so the backend routes into the correct per-client RPCServer.
 */
class BrowserSseTransport implements Transport {
	private messageHandlers = new Set<(msg: unknown) => void>();
	private errorHandlers = new Set<(err: Error) => void>();
	private disconnectHandlers = new Set<() => void>();
	private eventSource: EventSource | null = null;
	clientId: string | null = null;
	private baseUrl = "";
	private connected = false;
	private closed = false;

	constructor(baseUrl: string, token: string) {
		this.baseUrl = baseUrl;
		this.connect(token);
	}

	private connect(token: string): void {
		const url = `${this.baseUrl}/api/events?token=${encodeURIComponent(token)}`;
		const es = new EventSource(url);
		this.eventSource = es;

		// "ready" event carries the clientId — fires on every (re)connect.
		// Must update clientId each time because reconnect assigns a new one.
		es.addEventListener("ready", (ev: MessageEvent) => {
			try {
				const data = JSON.parse(ev.data);
				this.clientId = data.clientId;
				this.connected = true;
			} catch {
				/* ignore */
			}
		});

		// Default message channel: "data:" frames carry RPC responses/events
		es.onmessage = (ev: MessageEvent) => {
			try {
				const msg = JSON.parse(ev.data);
				for (const handler of [...this.messageHandlers]) {
					handler(msg);
				}
			} catch {
				/* ignore parse errors */
			}
		};

		es.onopen = () => {
			this.connected = true;
		};

		es.onerror = () => {
			if (this.closed) return;
			this.connected = false;
			for (const handler of [...this.errorHandlers]) {
				handler(new Error("SSE connection error"));
			}
			for (const handler of [...this.disconnectHandlers]) {
				handler();
			}
			// EventSource auto-reconnects natively; clientId will refresh on "ready"
		};
	}

	async send(message: unknown): Promise<void> {
		if (this.closed) throw new Error("SSE transport closed");

		// Wait for clientId (with timeout to avoid hanging forever)
		if (!this.clientId) {
			await this.waitForClientId();
		}

		const url = `${this.baseUrl}/api/rpc?token=${encodeURIComponent(AUTH_TOKEN)}&clientId=${encodeURIComponent(this.clientId!)}`;
		const res = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(message),
		});

		// 404 = clientId stale (SSE reconnected with a new ID). Retry once.
		if (res.status === 404) {
			// Force wait for fresh clientId
			this.clientId = null;
			this.connected = false;
			await this.waitForClientId();
			// Retry the POST with the fresh clientId
			const retryUrl = `${this.baseUrl}/api/rpc?token=${encodeURIComponent(AUTH_TOKEN)}&clientId=${encodeURIComponent(this.clientId!)}`;
			const retryRes = await fetch(retryUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(message),
			});
			if (!retryRes.ok) {
				throw new Error(`RPC POST failed after retry: ${retryRes.status}`);
			}
			return;
		}

		if (!res.ok) {
			throw new Error(`RPC POST failed: ${res.status}`);
		}
	}

	private waitForClientId(timeoutMs = 10000): Promise<void> {
		if (this.clientId) return Promise.resolve();
		return new Promise((resolve, reject) => {
			const start = Date.now();
			const check = setInterval(() => {
				if (this.clientId) {
					clearInterval(check);
					resolve();
				} else if (Date.now() - start > timeoutMs) {
					clearInterval(check);
					reject(new Error("SSE 连接超时：未收到 clientId"));
				}
			}, 50);
		});
	}

	/** 等待 SSE ready 事件（clientId + connected），供 initialize() 使用 */
	async waitForReady(timeoutMs = 10000): Promise<void> {
		await this.waitForClientId(timeoutMs);
	}

	onMessage(handler: (msg: unknown) => void): () => void {
		this.messageHandlers.add(handler);
		return () => {
			this.messageHandlers.delete(handler);
		};
	}

	onError(handler: (err: Error) => void): () => void {
		this.errorHandlers.add(handler);
		return () => {
			this.errorHandlers.delete(handler);
		};
	}

	onDisconnect(handler: () => void): () => void {
		this.disconnectHandlers.add(handler);
		return () => {
			this.disconnectHandlers.delete(handler);
		};
	}

	isConnected(): boolean {
		return this.connected;
	}

	close(): void {
		this.closed = true;
		this.connected = false;
		if (this.eventSource) {
			this.eventSource.close();
			this.eventSource = null;
		}
		this.messageHandlers.clear();
		this.errorHandlers.clear();
		this.disconnectHandlers.clear();
	}
}

class APIClientImpl {
	private client: TypedClient<RPCMethods, RPCEvents> | null = null;
	private initPromise: Promise<void> | null = null;
	private _transport: "ipc" | "sse" = "sse";
	private _baseUrl: string | null = null;
	private sseTransport: BrowserSseTransport | null = null;

	/**
	 * 桌面端同步初始化：通过 executeJavascript 接收 + __electrobunBunBridge 发送
	 */
	initSyncForDesktop(): void {
		if (this.client) return;

		const ipcTransport = new IPCTransport();
		this._transport = "ipc";
		this._baseUrl = null;
		this.client = createTypedClient<RPCMethods, RPCEvents>(ipcTransport);
		this.setupElectrobunBridge(ipcTransport);
	}

	/**
	 * 异步初始化：Web 端使用（连接 SSE + HTTP）
	 */
	async initialize(): Promise<void> {
		// 已连接且 transport 正常 → 直接返回
		if (this.client && (this._transport === "ipc" || this.sseTransport?.isConnected())) {
			return;
		}

		// client 存在但 SSE 断开了 → 清理后重连
		if (this.client && this.sseTransport && !this.sseTransport.isConnected()) {
			this.sseTransport.close();
			this.sseTransport = null;
			this.client = null;
			this.initPromise = null;
		}

		if (this.initPromise) return this.initPromise;

		this.initPromise = (async () => {
			const env = this.detectEnvironment();

			if (env === "electrobun") {
				// 不应走到这里，桌面端应通过 initSyncForDesktop() 初始化
				this.initSyncForDesktop();
			} else {
				try {
					this._transport = "sse";
					const baseUrl = this.resolveBaseUrl();
					this.sseTransport = new BrowserSseTransport(baseUrl, AUTH_TOKEN);
					this.client = createTypedClient<RPCMethods, RPCEvents>(this.sseTransport);
					this._baseUrl = baseUrl;

					// 等待 SSE ready（clientId 到达）才认为初始化完成
					await this.sseTransport.waitForReady();
				} catch (err) {
					// 初始化失败 → 清理缓存，允许重试
					this.sseTransport?.close();
					this.sseTransport = null;
					this.client = null;
					this.initPromise = null;
					throw err;
				}
			}
		})();

		return this.initPromise;
	}

	private detectEnvironment(): "electrobun" | "browser" {
		if (typeof window === "undefined") return "browser";
		if ((window as any).__electrobunBunBridge) return "electrobun";
		return "browser";
	}

	private resolveBaseUrl(): string {
		if (typeof window === "undefined") return "http://localhost:5200";
		// In dev, Vite proxies /api → backend, so relative path works.
		// For standalone deployment, use window.location.origin.
		return window.location.origin;
	}

	/**
	 * 桌面端 IPC 桥接：
	 * - Bun → Browser: 通过 executeJavascript 调用 window.__piAgentIPC()
	 * - Browser → Bun: 通过 __electrobunBunBridge.postMessage 发送 Electrobun 消息格式
	 */
	private setupElectrobunBridge(ipcTransport: IPCTransport): void {
		if (typeof window === "undefined") return;

		const win = window as any;

		// 1. 注册接收函数：Bun 通过 executeJavascript 调用此函数发送消息到 Browser
		win.__piAgentIPC = (msg: unknown) => {
			ipcTransport.simulateMessage(msg);
		};

		// 2. 覆写 send：将 RPC-core 消息包装成 Electrobun 消息格式，通过原生桥接发送
		const bridge = win.__electrobunBunBridge;

		if (bridge) {
			ipcTransport.send = async (message: unknown) => {
				// 包装成 Electrobun message packet，bun 端 defineRPC 注册了 "rpc-message" handler
				const electrobunPacket = {
					type: "message",
					id: "rpc-message",
					payload: JSON.stringify(message),
				};
				bridge.postMessage(JSON.stringify(electrobunPacket));
			};
		}
	}

	getTransport(): "ipc" | "sse" {
		return this._transport;
	}

	/** Web 端 HTTP 基础 URL（如 http://localhost:5200），桌面端返回 null */
	getBaseUrl(): string | null {
		return this._baseUrl;
	}

	/** 获取当前 auth token（用于需要直接调 HTTP 的场景） */
	getAuthToken(): string {
		return AUTH_TOKEN;
	}

	async call<K extends keyof RPCMethods>(
		method: K,
		params: MethodParams<RPCMethods, K>
	): Promise<MethodResult<RPCMethods, K>> {
		const methodStr = method as string;
		const ttl = CACHEABLE_METHODS[methodStr];
		if (ttl !== undefined) {
			const cached = rpcCache.get<MethodResult<RPCMethods, K>>(methodStr, params, ttl);
			if (cached !== null) return cached;
		}

		await this.initialize();
		const t0 = performance.now();
		networkBus.emitRequest(methodStr, params);
		const result = await this.client!.call(method, params);
		const elapsed = Math.round(performance.now() - t0);
		networkBus.emitResponse(methodStr, elapsed);

		if (ttl !== undefined) {
			rpcCache.set(methodStr, params, result);
		}

		return result;
	}

	async subscribe<K extends keyof RPCEvents>(
		eventType: K,
		handler: (payload: EventPayload<RPCEvents[K]>, metadata: EventMetadata<RPCEvents[K]>) => void,
		filter?: Record<string, unknown>
	): Promise<string> {
		await this.initialize();

		// Wrap handler to capture SSE events for the network panel
		const wrapped = (payload: EventPayload<RPCEvents[K]>, metadata: EventMetadata<RPCEvents[K]>) => {
			networkBus.emitEvent(eventType as string, metadata as unknown as Record<string, unknown> | undefined);
			handler(payload, metadata);
		};

		const subId = this.client!.subscribe(eventType, wrapped, filter);
		return subId;
	}

	unsubscribe(subscriptionId: string): void {
		this.client?.unsubscribe(subscriptionId);
	}

	isConnected(): boolean {
		return this.client !== null;
	}

	close(): void {
		this.client?.close();
	}
}

export const apiClient = new APIClientImpl();
export type { APIClientImpl, RPCMethods, RPCEvents };
export type { Transport };
