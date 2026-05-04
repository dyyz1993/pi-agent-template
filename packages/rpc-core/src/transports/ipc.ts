import { BaseTransport } from './base-transport';
import type { Transport, MessageHandler, ErrorHandler } from '../core/transport';
import type { RPCLogger } from '../core/types';

export interface IPCTransportOptions {
  logger?: RPCLogger;
}

export class IPCTransport extends BaseTransport implements Transport {
  private logger?: IPCTransportOptions['logger'];
  private peer: IPCTransport | null = null;

  constructor(options?: IPCTransportOptions) {
    super();
    this.logger = options?.logger;
  }

  static createPair(options?: IPCTransportOptions): { client: IPCTransport; server: IPCTransport } {
    const client = new IPCTransport(options);
    const server = new IPCTransport(options);

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

    this.logger?.debug?.('IPC send', message);

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

  simulateMessage(message: unknown): void {
    this.emitMessage(message);
  }
}
