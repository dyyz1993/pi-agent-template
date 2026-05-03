import type { Transport } from './core/transport';
import type { RPCMessage, RPCEvent, EventHandler, RPCLogger } from './core/types';
import { generateId, matchFilter } from './core/utils';

export type { RPCLogger };

export interface RPCClientOptions {
  transport: Transport;
  timeout?: number;
  logger?: RPCLogger;
  onError?: (error: Error, context: string) => void;
}

export class RPCClient {
  private _transport: Transport;
  get transport(): Transport { return this._transport; }
  private timeout: number;
  private pendingRequests: Map<string, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }> = new Map();
  private subscriptions: Map<string, { eventType: string; filter: Record<string, unknown>; handler: EventHandler }> = new Map();
  private subscriptionKeys: Map<string, string> = new Map();
  private logger?: RPCClientOptions['logger'];
  private onError?: (error: Error, context: string) => void;

  constructor(options: RPCClientOptions) {
    this._transport = options.transport;
    this.timeout = options.timeout || 30000;
    this.logger = options.logger;
    this.onError = options.onError;
    this.setupTransport();
  }

  private setupTransport(): void {
    this.logger?.info?.('setupTransport called, registering message handler');
    this._transport.onMessage((message) => {
      const msg = message as RPCMessage;
        this.logger?.info?.('Received message in handler:', msg.type, 'id:', msg.id);
      this.handleMessage(msg);
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

    if (message.error) {
      pending.reject(new Error(message.error.message));
    } else {
      pending.resolve(message.result);
    }
  }

  private handleEvent(event: RPCEvent): void {
    this.logger?.info?.('handleEvent:', event.eventType, 'metadata:', event.metadata, 'subscriptions:', this.subscriptions.size);
    for (const [subId, sub] of this.subscriptions) {
      this.logger?.info?.('Checking subscription:', subId, 'eventType:', sub.eventType, 'filter:', sub.filter);
      if (sub.eventType !== event.eventType) continue;
      if (matchFilter(event, sub.filter)) {
        this.logger?.info?.('Matched! Calling handler for:', subId);
        sub.handler(event);
      } else {
        this.logger?.info?.('Filter not matched');
      }
    }
  }

  async call<T = unknown>(method: string, params: unknown): Promise<T> {
    const id = generateId();
    const message: RPCMessage = {
      id,
      type: 'request',
      method,
      params,
    };
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, this.timeout);

      this.pendingRequests.set(id, {
        resolve: (value) => {
          clearTimeout(timeoutId);
          resolve(value as T);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
      });

      this._transport.send(message).catch(error => {
        this.pendingRequests.delete(id);
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }

  private generateSubscriptionKey(eventType: string, filter: Record<string, unknown>): string {
    const filterStr = Object.keys(filter).length > 0 
      ? JSON.stringify(Object.entries(filter).sort(([a], [b]) => a.localeCompare(b)))
      : '';
    return `${eventType}:${filterStr}`;
  }

  subscribe(eventType: string, filter: Record<string, unknown>, handler: EventHandler): string {
    const subscriptionKey = this.generateSubscriptionKey(eventType, filter);
    
    const existingSubId = this.subscriptionKeys.get(subscriptionKey);
    if (existingSubId) {
      this.logger?.info?.('Reusing existing subscription:', existingSubId, 'for key:', subscriptionKey);
      const existing = this.subscriptions.get(existingSubId);
      if (existing) {
        this.subscriptions.set(existingSubId, { ...existing, handler });
        return existingSubId;
      }
    }

    const subscriptionId = generateId();

    this.subscriptions.set(subscriptionId, { eventType, filter, handler });
    this.subscriptionKeys.set(subscriptionKey, subscriptionId);

    const message: RPCMessage = {
      id: subscriptionId,
      type: 'subscribe',
      eventType,
      filter,
    };

    this.logger?.info?.('Sending subscribe message:', message, 'key:', subscriptionKey);
    this._transport.send(message).catch(error => {
      this.logger?.error?.('Subscribe error:', error);
      this.onError?.(error, 'subscribe');
    });

    return subscriptionId;
  }

  unsubscribe(subscriptionId: string): void {
    const sub = this.subscriptions.get(subscriptionId);
    if (sub) {
      const key = this.generateSubscriptionKey(sub.eventType, sub.filter);
      this.subscriptionKeys.delete(key);
    }
    this.subscriptions.delete(subscriptionId);

    const message: RPCMessage = {
      id: generateId(),
      type: 'unsubscribe',
      subscriptionId,
    };

    this._transport.send(message).catch(error => {
      this.onError?.(error, 'unsubscribe');
    });
  }

  close(): void {
    this.pendingRequests.clear();
    this.subscriptions.clear();
    this.subscriptionKeys.clear();
    this._transport.close();
  }

  isConnected(): boolean {
    return this.transport.isConnected();
  }
}
