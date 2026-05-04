import { BaseTransport } from './base-transport';
import type { Transport, MessageHandler, ErrorHandler } from '../core/transport';
import type { RPCLogger } from '../core/types';

export interface InMemoryTransportOptions {
  logger?: RPCLogger;
}

export class InMemoryTransport extends BaseTransport implements Transport {
  private peer: InMemoryTransport | null = null;

  constructor(_options?: InMemoryTransportOptions) {
    super();
  }

  static createPair(options?: InMemoryTransportOptions): { client: InMemoryTransport; server: InMemoryTransport } {
    const client = new InMemoryTransport(options);
    const server = new InMemoryTransport(options);

    client.peer = server;
    server.peer = client;
    client._isConnected = true;
    server._isConnected = true;

    return { client, server };
  }

  async send(message: unknown): Promise<void> {
    if (!this._isConnected) {
      throw new Error('Transport is not connected');
    }

    if (!this.peer) {
      throw new Error('No peer connected');
    }

    for (const handler of this.peer.messageHandlers) {
      handler(message);
    }
  }

  onMessage(handler: MessageHandler): () => void {
    return super.onMessage(handler);
  }

  onError(handler: ErrorHandler): () => void {
    return super.onError(handler);
  }

  isConnected(): boolean {
    return super.isConnected();
  }

  close(): void {
    this._isConnected = false;
    if (this.peer) {
      this.peer._isConnected = false;
      this.peer = null;
    }
    this.clearHandlers();
  }

  simulateError(error: Error): void {
    this.emitError(error);
  }
}
