/**
 * Network Bus — lightweight event emitter for RPC/SSE communication logging.
 *
 * The api-client emits events here on every request/response/SSE-event.
 * The NetworkPanel subscribes to render a live activity feed, giving the
 * user visibility into the transport layer (solving the "I can't see any
 * RPC activity" problem with the old silent WebSocket transport).
 */

export interface NetworkLogEntry {
	id: string;
	time: number;
	kind: "request" | "response" | "event" | "status";
	label: string;
	detail?: string;
}

type NetworkListener = (entry: NetworkLogEntry) => void;

class NetworkBus {
	private listeners = new Set<NetworkListener>();
	private entries: NetworkLogEntry[] = [];
	private maxEntries = 200;
	private counter = 0;

	subscribe(listener: NetworkListener): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	getEntries(): NetworkLogEntry[] {
		return [...this.entries];
	}

	private emit(entry: Omit<NetworkLogEntry, "id" | "time">): void {
		const full: NetworkLogEntry = {
			...entry,
			id: `net_${++this.counter}`,
			time: Date.now(),
		};
		this.entries.push(full);
		if (this.entries.length > this.maxEntries) {
			this.entries.shift();
		}
		for (const listener of [...this.listeners]) {
			listener(full);
		}
	}

	emitRequest(method: string, params: unknown): void {
		const paramSummary = this.summarize(params);
		this.emit({
			kind: "request",
			label: `POST /api/rpc → ${method}`,
			detail: paramSummary,
		});
	}

	emitResponse(method: string, elapsedMs: number): void {
		this.emit({
			kind: "response",
			label: `← ${method}`,
			detail: `${elapsedMs}ms`,
		});
	}

	emitEvent(eventType: string, metadata?: Record<string, unknown>): void {
		this.emit({
			kind: "event",
			label: `← SSE ${eventType}`,
			detail: metadata ? JSON.stringify(metadata) : undefined,
		});
	}

	emitStatus(message: string): void {
		this.emit({
			kind: "status",
			label: message,
		});
	}

	private summarize(value: unknown): string {
		if (value === null || value === undefined) return "";
		const str = JSON.stringify(value);
		if (!str) return "";
		return str.length > 120 ? str.slice(0, 117) + "..." : str;
	}
}

export const networkBus = new NetworkBus();
