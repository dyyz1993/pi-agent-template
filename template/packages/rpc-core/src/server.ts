import type { Transport } from './core/transport';
import type { RPCMessage, RPCHandler, RPCEvent, RPCLogger, RPCRequest, RPCSubscribe } from './core/types';
import type { MiddlewareChain } from './core/middleware';
import type { RequestContext } from './core/context';
import { generateId } from './core/utils';

export interface RPCServerOptions {
  logger?: RPCLogger;
  middleware?: MiddlewareChain;
}

export class RPCServer {
  private transport: Transport;
  private handlers: Map<string, RPCHandler> = new Map();
  private subscriptions: Map<string, { eventType: string; filter: Record<string, unknown>; context?: RequestContext }> = new Map();
  private logger?: RPCServerOptions['logger'];
  private middleware: MiddlewareChain;
  private disconnectCleanup: (() => void) | null = null;

  constructor(transport: Transport, options?: RPCServerOptions) {
    this.transport = transport;
    this.logger = options?.logger;
    this.middleware = options?.middleware || [];
    this.setupTransport();
    this.setupDisconnectHandler();
  }

  private setupTransport(): void {
    this.transport.onMessage((message) => {
      this.handleMessage(message as RPCMessage);
    });
  }

  private setupDisconnectHandler(): void {
    if (this.transport.onDisconnect) {
      this.disconnectCleanup = this.transport.onDisconnect(() => {
        this.logger?.debug?.('Client disconnected, clearing subscriptions');
        this.subscriptions.clear();
      });
    }
  }

  private async runMiddleware(message: RPCMessage): Promise<{ allowed: boolean; context?: RequestContext; error?: { code: number; message: string } }> {
    let context: RequestContext | undefined;
    for (const mw of this.middleware) {
      const result = await mw.process(message);
      if (!result.allowed) {
        return { allowed: false, error: result.error };
      }
      if (result.context) {
        context = result.context;
      }
    }
    return { allowed: true, context };
  }

  private async handleMessage(message: RPCMessage): Promise<void> {
    if (message.type === 'response' || message.type === 'event') return;

    const mwResult = await this.runMiddleware(message);
    if (!mwResult.allowed) {
      if (message.type === 'request') {
        await this.transport.send({
          id: (message as RPCRequest).id,
          type: 'response',
          error: mwResult.error || { code: 403, message: 'Forbidden' },
        });
      }
      return;
    }

    const context = mwResult.context || (message as Record<string, unknown>).context as RequestContext | undefined;

    switch (message.type) {
      case 'request':
        await this.handleRequest(message as RPCRequest, context);
        break;
      case 'subscribe':
        this.handleSubscribe(message as RPCSubscribe, context);
        break;
      case 'unsubscribe':
        this.handleUnsubscribe(message);
        break;
    }
  }

  private async handleRequest(message: RPCRequest, context?: RequestContext): Promise<void> {
    const handler = this.handlers.get(message.method);
    if (!handler) {
      await this.transport.send({
        id: message.id,
        type: 'response',
        error: { code: 404, message: `Method not found: ${message.method}` },
      });
      return;
    }
    try {
      const result = await handler(message.params, context);
      await this.transport.send({ id: message.id, type: 'response', result });
    } catch (error) {
      await this.transport.send({
        id: message.id,
        type: 'response',
        error: { code: 500, message: error instanceof Error ? error.message : 'Internal server error' },
      });
    }
  }

  private handleSubscribe(message: RPCSubscribe, context?: RequestContext): void {
    this.subscriptions.set(message.id, { eventType: message.eventType, filter: message.filter || {}, context });
    this.logger?.debug?.('Subscription added', { id: message.id, eventType: message.eventType });
  }

  private handleUnsubscribe(message: RPCMessage): void {
    this.subscriptions.delete((message as { subscriptionId: string }).subscriptionId);
    this.logger?.debug?.('Subscription removed', { subscriptionId: (message as { subscriptionId: string }).subscriptionId });
  }

  register(method: string, handler: RPCHandler): void {
    this.handlers.set(method, handler);
  }

  unregister(method: string): void {
    this.handlers.delete(method);
  }

  async emitEvent<Metadata = Record<string, unknown>>(eventType: string, payload: unknown, metadata?: Metadata): Promise<void> {
    const event: RPCEvent<Metadata> = { id: generateId(), type: 'event', eventType, payload, metadata, timestamp: Date.now() };
    const sentKeys = new Set<string>();
    for (const [, sub] of this.subscriptions) {
      if (sub.eventType !== eventType) continue;
      if (!this.shouldSendEvent(event, sub.filter)) continue;
      const key = this.subscriptionKey(sub.eventType, sub.filter);
      if (sentKeys.has(key)) continue;
      sentKeys.add(key);
      await this.transport.send(event);
    }
  }

  private subscriptionKey(eventType: string, filter: Record<string, unknown>): string {
    if (!filter || Object.keys(filter).length === 0) return eventType + ':*';
    return eventType + ':' + JSON.stringify(Object.entries(filter).sort(([a], [b]) => a.localeCompare(b)));
  }

  private shouldSendEvent<Metadata>(event: RPCEvent<Metadata>, filter: Record<string, unknown>): boolean {
    if (!filter || Object.keys(filter).length === 0) return true;
    if (!event.metadata) return false;
    for (const key in filter) {
      if (filter[key] !== undefined && filter[key] !== (event.metadata as Record<string, unknown>)[key]) return false;
    }
    return true;
  }

  close(): void {
    if (this.disconnectCleanup) this.disconnectCleanup();
    this.handlers.clear();
    this.subscriptions.clear();
    this.transport.close();
  }
}
