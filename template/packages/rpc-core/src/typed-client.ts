import type { Transport } from './core/transport';
import type { RPCMessage, RPCEvent, EventHandler } from './core/types';
import type { RPCMethods, RPCEvents, MethodParams, MethodResult, EventPayload, HasParams } from './core/schema';
import { generateId } from './core/utils';

export interface TypedRPCClientOptions<
  TMethods extends RPCMethods,
  TEvents extends RPCEvents
> {
  transport: Transport;
  timeout?: number;
  methods: TMethods;
  events?: TEvents;
  onError?: (error: Error, context: string) => void;
}

export class TypedRPCClient<
  TMethods extends RPCMethods,
  TEvents extends RPCEvents
> {
  readonly transport: Transport;
  private timeout: number;
  private pendingRequests: Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }> = new Map();
  private subscriptions: Map<string, { eventType: string; filter: Record<string, unknown>; handler: EventHandler }> = new Map();
  private onError?: (error: Error, context: string) => void;

  constructor(options: TypedRPCClientOptions<TMethods, TEvents>) {
    this.transport = options.transport;
    this.timeout = options.timeout || 30000;
    this.onError = options.onError;
    this.setupTransport();
  }

  private setupTransport(): void {
    this.transport.onMessage((message) => {
      this.handleMessage(message as RPCMessage);
    });
  }

  private handleMessage(message: RPCMessage): void {
    switch (message.type) {
      case 'response':
        this.handleResponse(message);
        break;
      case 'event':
        this.handleEvent(message as RPCEvent);
        break;
    }
  }

  private handleResponse(message: RPCMessage): void {
    const pending = this.pendingRequests.get(message.id);
    if (!pending) return;
    this.pendingRequests.delete(message.id);
    clearTimeout(pending.timer);
    if (message.error) {
      pending.reject(new Error(message.error.message));
    } else {
      pending.resolve(message.result);
    }
  }

  private handleEvent(event: RPCEvent): void {
    for (const [, sub] of this.subscriptions) {
      if (sub.eventType !== event.eventType) continue;
      if (this.matchFilter(event, sub.filter)) {
        sub.handler(event);
      }
    }
  }

  private matchFilter(event: RPCEvent, filter: Record<string, unknown>): boolean {
    if (!filter || Object.keys(filter).length === 0) return true;
    if (!event.metadata) return false;
    for (const key in filter) {
      if (filter[key] !== undefined && filter[key] !== (event.metadata as Record<string, unknown>)[key]) return false;
    }
    return true;
  }

  call<M extends keyof TMethods & string>(
    method: M,
    ...args: HasParams<MethodParams<TMethods, M>> extends true
      ? [params: MethodParams<TMethods, M>]
      : [params?: undefined]
  ): Promise<MethodResult<TMethods, M>> {
    const params = args[0];
    const id = generateId();
    const message: RPCMessage = { id, type: 'request', method, params };
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, this.timeout);
      this.pendingRequests.set(id, {
        resolve: (value) => { resolve(value as MethodResult<TMethods, M>); },
        reject,
        timer,
      });
      this.transport.send(message).catch((error) => {
        const p = this.pendingRequests.get(id);
        if (p) { clearTimeout(p.timer); this.pendingRequests.delete(id); }
        reject(error);
      });
    });
  }

  subscribe<E extends keyof TEvents & string>(
    eventType: E,
    filter: Record<string, unknown>,
    handler: (event: { eventType: E; payload: EventPayload<TEvents, E>; timestamp?: number; metadata?: Record<string, unknown> }) => void
  ): string {
    const subscriptionId = generateId();
    this.subscriptions.set(subscriptionId, { eventType, filter, handler: handler as EventHandler });
    this.transport.send({ id: subscriptionId, type: 'subscribe', eventType, filter }).catch((e) => this.onError?.(e, 'subscribe'));
    return subscriptionId;
  }

  unsubscribe(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId);
    this.transport.send({ id: generateId(), type: 'unsubscribe', subscriptionId }).catch((e) => this.onError?.(e, 'unsubscribe'));
  }

  close(): void {
    this.pendingRequests.forEach(p => { clearTimeout(p.timer); p.reject(new Error('Client closed')); });
    this.pendingRequests.clear();
    this.subscriptions.clear();
    this.transport.close();
  }

  isConnected(): boolean {
    return this.transport.isConnected();
  }
}
