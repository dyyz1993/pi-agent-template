import type { Transport, MessageHandler, DisconnectHandler } from '../core/transport';

export class CompositeTransport implements Transport {
  private transports: Map<string, Transport> = new Map();
  private requestTransportMap: Map<string, string> = new Map();
  private subscriptionTransportMap: Map<string, string> = new Map();
  private eventTypeTransportMap: Map<string, Set<string>> = new Map();
  private handlers: Set<MessageHandler> = new Set();
  private disconnectHandlers: Set<DisconnectHandler> = new Set();
  private connected = false;

  addTransport(name: string, transport: Transport): void {
    this.transports.set(name, transport);
    transport.onMessage((message) => {
      const msg = message as Record<string, unknown>;
      if (msg.type === 'request' && msg.id) {
        this.requestTransportMap.set(msg.id as string, name);
      }
      if (msg.type === 'subscribe' && msg.id) {
        this.subscriptionTransportMap.set(msg.id as string, name);
        const eventType = msg.eventType as string;
        if (!this.eventTypeTransportMap.has(eventType)) {
          this.eventTypeTransportMap.set(eventType, new Set());
        }
        this.eventTypeTransportMap.get(eventType)!.add(name);
      }
      if (msg.type === 'unsubscribe' && msg.subscriptionId) {
        const subId = msg.subscriptionId as string;
        this.subscriptionTransportMap.delete(subId);
      }
      this.handlers.forEach(h => h(message));
    });
    if (transport.onDisconnect) {
      transport.onDisconnect(() => {
        this.removeTransport(name);
        if (this.transports.size === 0) {
          this.disconnectHandlers.forEach(h => h());
        }
      });
    }
    this.updateConnected();
  }

  removeTransport(name: string): void {
    this.transports.delete(name);
    for (const [, transportNames] of this.eventTypeTransportMap) {
      transportNames.delete(name);
    }
    this.updateConnected();
  }

  private updateConnected(): void {
    for (const [, t] of this.transports) {
      if (t.isConnected()) {
        this.connected = true;
        return;
      }
    }
    this.connected = false;
  }

  async send(message: unknown): Promise<void> {
    const msg = message as Record<string, unknown>;

    if (msg.type === 'response' && msg.id) {
      const transportName = this.requestTransportMap.get(msg.id as string);
      this.requestTransportMap.delete(msg.id as string);
      if (transportName) {
        const transport = this.transports.get(transportName);
        if (transport) {
          await transport.send(message);
          return;
        }
      }
    }

    if (msg.type === 'event' && msg.eventType) {
      const subscribedTransports = this.eventTypeTransportMap.get(msg.eventType as string);
      if (subscribedTransports && subscribedTransports.size > 0) {
        const promises: Promise<void>[] = [];
        for (const transportName of subscribedTransports) {
          const transport = this.transports.get(transportName);
          if (transport && transport.isConnected()) {
            promises.push(transport.send(message));
          }
        }
        await Promise.all(promises);
        return;
      }
    }

    const promises: Promise<void>[] = [];
    for (const [, transport] of this.transports) {
      if (transport.isConnected()) {
        promises.push(transport.send(message));
      }
    }
    await Promise.all(promises);
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  onDisconnect(handler: DisconnectHandler): () => void {
    this.disconnectHandlers.add(handler);
    return () => this.disconnectHandlers.delete(handler);
  }

  close(): void {
    this.transports.forEach(t => t.close());
    this.handlers.clear();
    this.disconnectHandlers.clear();
    this.requestTransportMap.clear();
    this.subscriptionTransportMap.clear();
    this.eventTypeTransportMap.clear();
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getTransport<T extends Transport>(name: string): T | undefined {
    return this.transports.get(name) as T | undefined;
  }
}
