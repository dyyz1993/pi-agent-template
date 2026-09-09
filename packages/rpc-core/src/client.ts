import type { Transport } from "./core/transport";
import type {
	RPCMessage,
	RPCEvent,
	EventHandler,
	RPCLogger,
	RPCCallOptions,
	RPCRetryOptions,
} from "./core/types";
import { generateId, matchFilter } from "./core/utils";

export type { RPCLogger, RPCCallOptions, RPCRetryOptions };

export interface RPCClientOptions {
	transport: Transport;
	timeout?: number;
	logger?: RPCLogger;
	onError?: (error: Error, context: string) => void;
}

export class RPCTimeoutError extends Error {
	constructor(method: string, timeoutMs: number) {
		super(`Request timeout: ${method} after ${timeoutMs}ms`);
		this.name = "RPCTimeoutError";
	}
}

export class RPCAbortError extends Error {
	constructor(method: string) {
		super(`Request aborted: ${method}`);
		this.name = "RPCAbortError";
	}
}

export class RPCTransportError extends Error {
	cause?: unknown;

	constructor(method: string, cause: unknown) {
		const message = cause instanceof Error ? cause.message : String(cause);
		super(`Transport error while sending ${method}: ${message}`);
		this.name = "RPCTransportError";
		this.cause = cause;
	}
}

export class RPCServerError extends Error {
	code: number | undefined;

	constructor(message: string, code?: number) {
		super(message);
		this.name = "RPCServerError";
		this.code = code;
	}
}

export class RPCDisconnectError extends Error {
	constructor(method: string) {
		super(`Transport disconnected while request was pending: ${method}`);
		this.name = "RPCDisconnectError";
	}
}

interface PendingRequest {
	resolve: (value: unknown) => void;
	reject: (error: Error) => void;
	cleanup: () => void;
	method: string;
}

interface SubscriptionEntry {
	key: string;
	eventType: string;
	filter: Record<string, unknown>;
	handler: EventHandler;
}

/**
 * Multiple client-side subscriptions that share the same eventType + filter are
 * grouped: the server only sees one subscription (identified by serverId) and
 * events are dispatched to every handler in the group. The server-side
 * subscription is torn down when the last local handler unsubscribes.
 */
interface SubscriptionGroup {
	serverId: string;
	eventType: string;
	filter: Record<string, unknown>;
	handles: Set<string>;
}

export class RPCClient {
	private _transport: Transport;
	get transport(): Transport {
		return this._transport;
	}
	private timeout: number;
	private pendingRequests: Map<string, PendingRequest> = new Map();
	private subscriptions: Map<string, SubscriptionEntry> = new Map();
	private subscriptionGroups: Map<string, SubscriptionGroup> = new Map();
	private logger?: RPCClientOptions["logger"];
	private onError?: (error: Error, context: string) => void;

	constructor(options: RPCClientOptions) {
		this._transport = options.transport;
		this.timeout = options.timeout || 30000;
		this.logger = options.logger;
		this.onError = options.onError;
		this.setupTransport();
	}

	private setupTransport(): void {
		this.logger?.debug?.("setupTransport called, registering message handler");
		this._transport.onMessage((message) => {
			const msg = message as RPCMessage;
			this.logger?.debug?.("Received message in handler:", msg.type, "id:", msg.id);
			this.handleMessage(msg);
		});
		this._transport.onDisconnect?.(() => {
			this.failPendingRequests();
		});
		this._transport.onReconnect?.(() => {
			this.resubscribeAll();
		});
	}

	private handleMessage(message: RPCMessage): void {
		switch (message.type) {
			case "response":
				this.handleResponse(message);
				break;
			case "event":
				this.handleEvent(message as RPCEvent);
				break;
		}
	}

	private handleResponse(message: RPCMessage): void {
		const pending = this.pendingRequests.get(message.id);

		if (!pending) return;

		this.pendingRequests.delete(message.id);

		if (message.error) {
			pending.reject(new RPCServerError(message.error.message, message.error.code));
		} else {
			pending.resolve(message.result);
		}
	}

	private handleEvent(event: RPCEvent): void {
		this.logger?.debug?.(
			"handleEvent:",
			event.eventType,
			"metadata:",
			event.metadata,
			"subscriptions:",
			this.subscriptions.size
		);
		for (const [, sub] of this.subscriptions) {
			if (sub.eventType !== event.eventType) continue;
			if (matchFilter(event, sub.filter)) {
				try {
					sub.handler(event);
				} catch (err) {
					this.onError?.(err instanceof Error ? err : new Error(String(err)), "handleEvent");
				}
			}
		}
	}

	async call<T = unknown>(
		method: string,
		params?: unknown,
		options: RPCCallOptions = {}
	): Promise<T> {
		const retryOptions = this.normalizeRetryOptions(options.retry);
		let attempt = 0;

		while (true) {
			attempt++;
			try {
				return await this.callOnce<T>(method, params, options);
			} catch (error) {
				if (!this.shouldRetry(error, attempt, retryOptions)) {
					throw error;
				}
				await this.waitBeforeRetry(attempt, retryOptions!, options.signal);
			}
		}
	}

	private async callOnce<T = unknown>(
		method: string,
		params: unknown,
		options: RPCCallOptions
	): Promise<T> {
		if (options.signal?.aborted) {
			throw new RPCAbortError(method);
		}

		const id = generateId();
		const message: RPCMessage = {
			id,
			type: "request",
			method,
			params,
			...(options.metadata ? { metadata: options.metadata } : {}),
			...(options.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : {}),
		};
		const timeoutMs = this.resolveTimeout(options.timeoutMs);

		return new Promise((resolve, reject) => {
			let settled = false;

			const cleanup = () => {
				if (settled) return;
				settled = true;
				clearTimeout(timeoutId);
				options.signal?.removeEventListener("abort", onAbort);
			};

			const rejectPending = (error: Error) => {
				this.pendingRequests.delete(id);
				cleanup();
				reject(error);
			};

			const onAbort = () => {
				rejectPending(new RPCAbortError(method));
			};

			const timeoutId = setTimeout(() => {
				rejectPending(new RPCTimeoutError(method, timeoutMs));
			}, timeoutMs);

			options.signal?.addEventListener("abort", onAbort, { once: true });

			this.pendingRequests.set(id, {
				resolve: (value) => {
					cleanup();
					resolve(value as T);
				},
				reject: (error) => {
					cleanup();
					reject(error);
				},
				cleanup,
				method,
			});

			if (options.signal?.aborted) {
				onAbort();
				return;
			}

			this._transport.send(message).catch((error) => {
				rejectPending(new RPCTransportError(method, error));
			});
		});
	}

	private resolveTimeout(timeoutMs?: number): number {
		if (timeoutMs === undefined) return this.timeout;
		if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
			throw new Error(`Invalid RPC timeoutMs: ${String(timeoutMs)}`);
		}
		return timeoutMs;
	}

	private normalizeRetryOptions(retry: RPCCallOptions["retry"]): Required<RPCRetryOptions> | null {
		if (!retry) return null;
		return {
			maxAttempts: Math.max(1, Math.floor(retry.maxAttempts ?? 2)),
			baseDelayMs: Math.max(0, retry.baseDelayMs ?? 100),
			maxDelayMs: Math.max(0, retry.maxDelayMs ?? 1000),
			jitter: retry.jitter ?? true,
		};
	}

	private shouldRetry(
		error: unknown,
		attempt: number,
		retry: Required<RPCRetryOptions> | null
	): boolean {
		// Disconnect errors are deliberately not retried: the server may have
		// already processed the request before the connection dropped.
		return Boolean(retry && attempt < retry.maxAttempts && error instanceof RPCTransportError);
	}

	private waitBeforeRetry(
		attempt: number,
		retry: Required<RPCRetryOptions>,
		signal?: AbortSignal
	): Promise<void> {
		const exponentialDelay = retry.baseDelayMs * Math.pow(2, Math.max(0, attempt - 1));
		const cappedDelay = Math.min(exponentialDelay, retry.maxDelayMs);
		const delay = retry.jitter
			? Math.floor(cappedDelay * (0.5 + Math.random() * 0.5))
			: cappedDelay;

		if (delay <= 0) {
			if (signal?.aborted) return Promise.reject(new RPCAbortError("retry wait"));
			return Promise.resolve();
		}

		return new Promise((resolve, reject) => {
			if (signal?.aborted) {
				reject(new RPCAbortError("retry wait"));
				return;
			}

			const timer = setTimeout(() => {
				signal?.removeEventListener("abort", onAbort);
				resolve();
			}, delay);

			const onAbort = () => {
				clearTimeout(timer);
				signal?.removeEventListener("abort", onAbort);
				reject(new RPCAbortError("retry wait"));
			};

			signal?.addEventListener("abort", onAbort, { once: true });
		});
	}

	private failPendingRequests(): void {
		if (this.pendingRequests.size === 0) return;
		const pending = [...this.pendingRequests.values()];
		this.pendingRequests.clear();
		for (const request of pending) {
			request.cleanup();
			request.reject(new RPCDisconnectError(request.method));
		}
	}

	private resubscribeAll(): void {
		if (this.subscriptionGroups.size === 0) return;
		this.logger?.info?.(
			"Transport reconnected, resubscribing",
			this.subscriptionGroups.size,
			"subscription groups"
		);
		// The server clears its subscriptions on disconnect; re-register each
		// group with its original id so existing unsubscribe handles stay valid.
		for (const group of this.subscriptionGroups.values()) {
			this.sendSubscribe(group.serverId, group.eventType, group.filter);
		}
	}

	private generateSubscriptionKey(eventType: string, filter: Record<string, unknown>): string {
		const filterStr =
			Object.keys(filter).length > 0
				? JSON.stringify(Object.entries(filter).sort(([a], [b]) => a.localeCompare(b)))
				: "";
		return `${eventType}:${filterStr}`;
	}

	private sendSubscribe(
		serverId: string,
		eventType: string,
		filter: Record<string, unknown>
	): void {
		const message: RPCMessage = {
			id: serverId,
			type: "subscribe",
			eventType,
			filter,
		};
		this.logger?.debug?.("Sending subscribe message:", message, "serverId:", serverId);
		this._transport.send(message).catch((error) => {
			this.logger?.error?.("Subscribe error:", error);
			this.onError?.(error, "subscribe");
		});
	}

	private sendUnsubscribe(serverId: string): void {
		const message: RPCMessage = {
			id: generateId(),
			type: "unsubscribe",
			subscriptionId: serverId,
		};
		this._transport.send(message).catch((error) => {
			this.onError?.(error, "unsubscribe");
		});
	}

	subscribe(
		eventType: string,
		handler: EventHandler,
		filter: Record<string, unknown> = {}
	): string {
		const subscriptionKey = this.generateSubscriptionKey(eventType, filter);

		let group = this.subscriptionGroups.get(subscriptionKey);
		if (!group) {
			group = { serverId: generateId(), eventType, filter, handles: new Set() };
			this.subscriptionGroups.set(subscriptionKey, group);
			this.sendSubscribe(group.serverId, eventType, filter);
		}

		const subscriptionId = generateId();
		this.subscriptions.set(subscriptionId, {
			key: subscriptionKey,
			eventType,
			filter,
			handler,
		});
		group.handles.add(subscriptionId);

		return subscriptionId;
	}

	unsubscribe(subscriptionId: string): void {
		const sub = this.subscriptions.get(subscriptionId);
		if (!sub) return;

		this.subscriptions.delete(subscriptionId);

		const group = this.subscriptionGroups.get(sub.key);
		if (!group) return;

		group.handles.delete(subscriptionId);
		if (group.handles.size === 0) {
			this.subscriptionGroups.delete(sub.key);
			this.sendUnsubscribe(group.serverId);
		}
	}

	close(): void {
		for (const pending of this.pendingRequests.values()) {
			pending.reject(new Error("RPC client closed"));
		}
		this.pendingRequests.clear();
		this.subscriptions.clear();
		this.subscriptionGroups.clear();
		this._transport.close();
	}

	isConnected(): boolean {
		return this.transport.isConnected();
	}
}
