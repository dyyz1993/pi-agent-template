import type { Transport, MessageHandler, ErrorHandler, DisconnectHandler } from "../core/transport";
import type { RPCLogger } from "../core/types";

export interface WebSocketTransportOptions {
	url?: string;
	logger?: RPCLogger;
	reconnect?: boolean;
	reconnectInterval?: number;
	maxReconnectInterval?: number;
	maxReconnectAttempts?: number;
	heartbeatInterval?: number;
	heartbeatTimeout?: number;
	authToken?: string;
}

export class WebSocketTransport implements Transport {
	private url: string;
	private ws: WebSocket | null = null;
	private messageHandlers: Set<MessageHandler> = new Set();
	private errorHandlers: Set<ErrorHandler> = new Set();
	private disconnectHandlers: Set<DisconnectHandler> = new Set();
	private logger?: WebSocketTransportOptions["logger"];
	private reconnect: boolean;
	private reconnectInterval: number;
	private maxReconnectIntervalMs: number;
	private maxReconnectAttempts: number;
	private heartbeatIntervalMs: number;
	private heartbeatTimeoutMs: number;
	private _isConnected: boolean = false;
	private _isConnecting: boolean = false;
	private authToken?: string;

	private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
	private lastPongTime: number = 0;
	private reconnectAttempts: number = 0;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

	constructor(urlOrOptions: string | WebSocketTransportOptions) {
		const opts = typeof urlOrOptions === "object" ? urlOrOptions : {};
		if (typeof urlOrOptions === "string") {
			this.url = urlOrOptions;
		} else {
			this.url = urlOrOptions.url || "";
		}
		this.logger = opts.logger;
		this.reconnect = opts.reconnect ?? true;
		this.reconnectInterval = opts.reconnectInterval ?? 3000;
		this.maxReconnectIntervalMs = opts.maxReconnectInterval ?? 30000;
		this.maxReconnectAttempts = opts.maxReconnectAttempts ?? 10;
		this.heartbeatIntervalMs = opts.heartbeatInterval ?? 0;
		this.heartbeatTimeoutMs = opts.heartbeatTimeout ?? 30000;
		this.authToken = opts.authToken;
	}

	private startHeartbeat(): void {
		this.stopHeartbeat();
		this.lastPongTime = Date.now();

		if (this.ws) {
			(this.ws as any).onpong = () => {
				this.lastPongTime = Date.now();
			};
		}

		this.heartbeatTimer = setInterval(() => {
			if (!this.ws || (this.ws as any).readyState !== 1) return;

			if (Date.now() - this.lastPongTime > this.heartbeatTimeoutMs * 2) {
				this.stopHeartbeat();
				this._isConnected = false;

				for (const handler of this.disconnectHandlers) {
					handler();
				}

				if (this.ws) {
					(this.ws as any).onclose = null;
					this.ws.close();
				}

				if (this.reconnect) {
					this.scheduleReconnect();
				}
				return;
			}

			if (typeof (this.ws as any).ping === "function") {
				(this.ws as any).ping();
			}
		}, this.heartbeatIntervalMs || 30000);
	}

	private stopHeartbeat(): void {
		if (this.heartbeatTimer) {
			clearInterval(this.heartbeatTimer);
			this.heartbeatTimer = null;
		}
	}

	private scheduleReconnect(): void {
		if (!this.reconnect) return;
		if (this.reconnectAttempts >= this.maxReconnectAttempts) {
			this.logger?.error?.("Max reconnect attempts reached");
			return;
		}

		const delay = Math.min(
			this.reconnectInterval * Math.pow(2, this.reconnectAttempts),
			this.maxReconnectIntervalMs
		);

		this.reconnectAttempts++;
		this.reconnectTimer = setTimeout(async () => {
			try {
				await this.connect();
				this.reconnectAttempts = 0;
			} catch {
				this.scheduleReconnect();
			}
		}, delay);
	}

	async connect(): Promise<void> {
		if (this._isConnecting) {
			return;
		}

		this._isConnecting = true;

		if (this.ws) {
			(this.ws as any).onopen = null;
			(this.ws as any).onmessage = null;
			(this.ws as any).onerror = null;
			(this.ws as any).onclose = null;
			(this.ws as any).onpong = null;
			this.ws.close();
			this.ws = null;
		}

		return new Promise((resolve, reject) => {
			this.logger?.info?.("Creating new WebSocket to:", this.url);
			const protocols = this.authToken ? [this.authToken] : undefined;
			this.ws = new WebSocket(this.url, protocols);

			this.ws.onopen = () => {
				this._isConnected = true;
				this._isConnecting = false;
				this.reconnectAttempts = 0;
				this.logger?.info?.("Connected, messageHandlers:", this.messageHandlers.size);
				if (this.heartbeatIntervalMs > 0) {
					this.startHeartbeat();
				}
				resolve();
			};

			this.ws.onmessage = (event) => {
				this.logger?.info?.("onmessage triggered, data length:", event.data?.length);
				try {
					const message = JSON.parse(event.data);
					this.logger?.info?.("Parsed message:", message.type, "id:", message.id);
					if (this.messageHandlers.size === 0) {
						this.logger?.error?.("WARNING: No message handlers registered!");
					}
					for (const handler of this.messageHandlers) {
						handler(message);
					}
				} catch (error) {
					this.logger?.error?.("Failed to parse message:", error);
				}
			};

			this.ws.onerror = (error) => {
				this._isConnecting = false;
				this.logger?.error?.("Error:", error);
				reject(new Error("WebSocket connection failed"));
				for (const handler of this.errorHandlers) {
					handler(new Error("WebSocket error"));
				}
			};

			this.ws.onclose = () => {
				this._isConnected = false;
				this._isConnecting = false;
				this.stopHeartbeat();
				this.logger?.info?.("Disconnected");

				for (const handler of this.disconnectHandlers) {
					handler();
				}

				if (this.reconnect) {
					this.scheduleReconnect();
				}
			};
		});
	}

	async send(message: unknown): Promise<void> {
		if (!this.ws || !this._isConnected) {
			throw new Error("WebSocket is not connected");
		}

		this.ws.send(JSON.stringify(message));
	}

	onMessage(handler: MessageHandler): () => void {
		this.logger?.info?.("Adding message handler, current count:", this.messageHandlers.size);
		this.messageHandlers.add(handler);
		this.logger?.info?.("After adding, count:", this.messageHandlers.size);
		return () => {
			this.messageHandlers.delete(handler);
		};
	}

	onError(handler: ErrorHandler): () => void {
		this.errorHandlers.add(handler);
		return () => {
			this.errorHandlers.delete(handler);
		};
	}

	onDisconnect(handler: DisconnectHandler): () => void {
		this.disconnectHandlers.add(handler);
		return () => {
			this.disconnectHandlers.delete(handler);
		};
	}

	isConnected(): boolean {
		return this._isConnected;
	}

	close(): void {
		this.logger?.info?.("Closing, messageHandlers:", this.messageHandlers.size);
		this.reconnect = false;
		this.stopHeartbeat();
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
		if (this.ws) {
			(this.ws as any).onopen = null;
			(this.ws as any).onmessage = null;
			(this.ws as any).onerror = null;
			(this.ws as any).onclose = null;
			(this.ws as any).onpong = null;
			this.ws.close();
			this.ws = null;
		}
		this._isConnected = false;
		this._isConnecting = false;
		this.messageHandlers.clear();
		this.errorHandlers.clear();
		this.disconnectHandlers.clear();
	}

	private setupMock(ws: WebSocket, isConnected: boolean): void {
		this.ws = ws;
		this._isConnected = isConnected;
	}

	static createPair(options?: WebSocketTransportOptions): {
		client: WebSocketTransport;
		server: WebSocketTransport;
	} {
		const client = new WebSocketTransport({ ...options, url: "mock://client", reconnect: false });
		const server = new WebSocketTransport({ ...options, url: "mock://server", reconnect: false });

		const clientSend = (data: string) => {
			try {
				const message = JSON.parse(data);
				for (const handler of server.messageHandlers) {
					handler(message);
				}
			} catch {
				/* parse error */
			}
		};

		const serverSend = (data: string) => {
			try {
				const message = JSON.parse(data);
				for (const handler of client.messageHandlers) {
					handler(message);
				}
			} catch {
				/* parse error */
			}
		};

		const clientWs = {
			onopen: null as (() => void) | null,
			onmessage: null as ((event: { data: string }) => void) | null,
			onerror: null as ((error: unknown) => void) | null,
			onclose: null as (() => void) | null,
			close: () => {},
			send: clientSend,
		};

		const serverWs = {
			onopen: null as (() => void) | null,
			onmessage: null as ((event: { data: string }) => void) | null,
			onerror: null as ((error: unknown) => void) | null,
			onclose: null as (() => void) | null,
			close: () => {},
			send: serverSend,
		};

		client.setupMock(clientWs as unknown as WebSocket, true);
		server.setupMock(serverWs as unknown as WebSocket, true);

		return { client, server };
	}
}
