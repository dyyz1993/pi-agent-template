import type { Transport } from "./core/transport";
import type {
	RPCMessage,
	RPCHandler,
	RPCEvent,
	RPCLogger,
	DefaultEventMetadata,
} from "./core/types";
import { generateId, matchFilter } from "./core/utils";

export interface RPCServerOptions {
	logger?: RPCLogger;
	onError?: (error: unknown) => void;
}

export class RPCServer {
	private transport: Transport;
	private handlers: Map<string, RPCHandler> = new Map();
	private subscriptions: Map<string, { eventType: string; filter: Record<string, unknown> }> =
		new Map();
	private logger?: RPCServerOptions["logger"];
	private onError?: (error: unknown) => void;
	private disconnectCleanup: (() => void) | null = null;

	constructor(transport: Transport, options?: RPCServerOptions) {
		this.transport = transport;
		this.logger = options?.logger;
		this.onError = options?.onError;
		this.setupTransport();
		this.setupDisconnectHandler();
	}

	private setupTransport(): void {
		this.transport.onMessage((message) => {
			this.handleMessage(message as RPCMessage).catch((err) => {
				this.onError?.(err);
			});
		});
	}

	private setupDisconnectHandler(): void {
		if (this.transport.onDisconnect) {
			this.disconnectCleanup = this.transport.onDisconnect(() => {
				this.logger?.info?.("Client disconnected, clearing all subscriptions");
				this.subscriptions.clear();
			});
		}
	}

	private async handleMessage(message: RPCMessage): Promise<void> {
		if (!message || typeof message !== "object") return;
		const msg = message as unknown as Record<string, unknown>;
		if (!msg.type || typeof msg.type !== "string") return;

		switch (msg.type) {
			case "request":
				await this.handleRequest(message);
				break;
			case "subscribe":
				this.handleSubscribe(message);
				break;
			case "unsubscribe":
				this.handleUnsubscribe(message);
				break;
		}
	}

	private async handleRequest(message: RPCMessage): Promise<void> {
		const handler = this.handlers.get(message.method!);

		if (!handler) {
			await this.transport.send({
				id: message.id,
				type: "response",
				error: { code: 404, message: `Method not found: ${message.method}` },
			});
			return;
		}

		try {
			const result = await handler(message.params);
			await this.transport.send({
				id: message.id,
				type: "response",
				result,
			});
		} catch (error) {
			this.onError?.(error);
			try {
				await this.transport.send({
					id: message.id,
					type: "response",
					error: {
						code: 500,
						message: error instanceof Error ? error.message : "Internal server error",
					},
				});
			} catch (sendError) {
				this.onError?.(sendError);
			}
		}
	}

	private handleSubscribe(message: RPCMessage): void {
		const subscriptionId = message.id;
		const eventType = message.eventType!;
		const filter = message.filter || {};

		this.subscriptions.set(subscriptionId, { eventType, filter });

		this.logger?.info?.("Subscription added", {
			subscriptionId,
			eventType,
			filter,
			totalSubscriptions: this.subscriptions.size,
		});
	}

	private handleUnsubscribe(message: RPCMessage): void {
		const subscriptionId = message.subscriptionId!;
		this.subscriptions.delete(subscriptionId);

		this.logger?.debug?.("Subscription removed", { subscriptionId });
	}

	register(method: string, handler: RPCHandler): void {
		this.handlers.set(method, handler);
	}

	unregister(method: string): void {
		this.handlers.delete(method);
	}

	async emitEvent<Metadata = DefaultEventMetadata>(
		eventType: string,
		payload: unknown,
		metadata?: Metadata
	): Promise<void> {
		const event: RPCEvent<Metadata> = {
			id: generateId(),
			type: "event",
			eventType,
			payload,
			metadata,
			timestamp: Date.now(),
		};

		this.logger?.info?.("Emitting event", {
			eventType,
			metadata,
			subscriptionCount: this.subscriptions.size,
		});

		let hasMatchingSubscription = false;
		for (const [subId, sub] of this.subscriptions) {
			this.logger?.debug?.("Checking subscription", {
				subscriptionId: subId,
				eventType: sub.eventType,
				filter: sub.filter,
			});
			if (sub.eventType !== eventType) continue;

			if (matchFilter(event, sub.filter)) {
				hasMatchingSubscription = true;
				break;
			} else {
				this.logger?.debug?.("Filter not matched", {
					filter: sub.filter,
					eventMetadata: event.metadata,
				});
			}
		}

		if (hasMatchingSubscription) {
			this.logger?.info?.("Sending event to client", { eventType });
			await this.transport.send(event);
		} else {
			const activeEventTypes = [
				...new Set([...this.subscriptions.values()].map((s) => s.eventType)),
			];
			const metadataKeys = metadata ? Object.keys(metadata as Record<string, unknown>) : [];
			const filterKeys = [
				...new Set(
					[...this.subscriptions.values()]
						.filter((s) => s.eventType === eventType)
						.flatMap((s) => Object.keys(s.filter))
				),
			];

			this.logger?.warn?.(`No matching subscription for event "${eventType}"`, {
				activeEventTypes,
				metadataKeys,
				filterKeys,
				hint:
					metadataKeys.length > 0 && filterKeys.length > 0
						? "Check if filter keys match metadata keys (case-sensitive)"
						: undefined,
			});
		}
	}

	getRegisteredMethods(): string[] {
		return Array.from(this.handlers.keys());
	}

	getActiveSubscriptions(): Array<{
		id: string;
		eventType: string;
		filter: Record<string, unknown>;
	}> {
		return Array.from(this.subscriptions.entries()).map(([id, sub]) => ({
			id,
			eventType: sub.eventType,
			filter: sub.filter,
		}));
	}

	close(): void {
		if (this.disconnectCleanup) {
			this.disconnectCleanup();
		}
		this.handlers.clear();
		this.subscriptions.clear();
		this.transport.close();
	}

	clearAllSubscriptions(): void {
		this.logger?.info?.("Clearing all subscriptions", { count: this.subscriptions.size });
		this.subscriptions.clear();
	}
}
