import type { Transport, MessageHandler, ErrorHandler } from '../core/transport';
import type { RPCLogger } from '../core/types';

export interface IPCTransportOptions {
  logger?: RPCLogger;
}

export class IPCTransport implements Transport {
  private messageHandlers: Set<MessageHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private logger?: IPCTransportOptions['logger'];
  private peer: IPCTransport | null = null;
  private _isConnected: boolean = false;

  constructor(options?: IPCTransportOptions) {
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
    this.messageHandlers.add(handler);
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

  isConnected(): boolean {
    return this._isConnected;
  }

  close(): void {
    this._isConnected = false;
    if (this.peer) {
      this.peer._isConnected = false;
      this.peer = null;
    }
    this.messageHandlers.clear();
    this.errorHandlers.clear();
  }

  simulateMessage(message: unknown): void {
    for (const handler of this.messageHandlers) {
      handler(message);
    }
  }
}
