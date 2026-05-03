import type { Transport, MessageHandler, ErrorHandler } from '../core/transport';
import type { RPCLogger } from '../core/types';

export interface WebSocketTransportOptions {
  url?: string;
  logger?: RPCLogger;
  reconnect?: boolean;
  reconnectInterval?: number;
}

export class WebSocketTransport implements Transport {
  private url: string;
  private ws: WebSocket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private logger?: WebSocketTransportOptions['logger'];
  private reconnect: boolean;
  private reconnectInterval: number;
  private _isConnected: boolean = false;
  private _isConnecting: boolean = false;

  constructor(urlOrOptions: string | WebSocketTransportOptions) {
    if (typeof urlOrOptions === 'string') {
      this.url = urlOrOptions;
    } else {
      this.url = urlOrOptions.url || '';
    }
    this.logger = typeof urlOrOptions === 'object' ? urlOrOptions.logger : undefined;
    this.reconnect = typeof urlOrOptions === 'object' ? (urlOrOptions.reconnect ?? true) : true;
    this.reconnectInterval = typeof urlOrOptions === 'object' ? (urlOrOptions.reconnectInterval ?? 3000) : 3000;
  }

  async connect(): Promise<void> {
    if (this._isConnecting) {
      return;
    }

    this._isConnecting = true;

    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }

    return new Promise((resolve, reject) => {
      this.logger?.info?.('Creating new WebSocket to:', this.url);
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this._isConnected = true;
        this._isConnecting = false;
        this.logger?.info?.('Connected, messageHandlers:', this.messageHandlers.size);
        resolve();
      };

      this.ws.onmessage = (event) => {
        this.logger?.info?.('onmessage triggered, data length:', event.data?.length);
        try {
          const message = JSON.parse(event.data);
          this.logger?.info?.('Parsed message:', message.type, 'id:', message.id);
          if (this.messageHandlers.size === 0) {
            this.logger?.error?.('WARNING: No message handlers registered!');
          }
          for (const handler of this.messageHandlers) {
            handler(message);
          }
        } catch (error) {
          this.logger?.error?.('Failed to parse message:', error);
        }
      };

      this.ws.onerror = (error) => {
        this._isConnecting = false;
        this.logger?.error?.('Error:', error);
        reject(new Error('WebSocket connection failed'));
        for (const handler of this.errorHandlers) {
          handler(new Error('WebSocket error'));
        }
      };

      this.ws.onclose = () => {
        this._isConnected = false;
        this._isConnecting = false;
        this.logger?.info?.('Disconnected');
        
        if (this.reconnect) {
          this.logger?.info?.('Will reconnect in', this.reconnectInterval, 'ms');
          setTimeout(() => {
            this.logger?.info?.('Reconnecting...');
            this.connect().catch(e => { this.logger?.error?.('Reconnect failed:', e); });
          }, this.reconnectInterval);
        }
      };
    });
  }

  async send(message: unknown): Promise<void> {
    if (!this.ws || !this._isConnected) {
      throw new Error('WebSocket is not connected');
    }

    this.ws.send(JSON.stringify(message));
  }

  onMessage(handler: MessageHandler): () => void {
    this.logger?.info?.('Adding message handler, current count:', this.messageHandlers.size);
    this.messageHandlers.add(handler);
    this.logger?.info?.('After adding, count:', this.messageHandlers.size);
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
    this.logger?.info?.('Closing, messageHandlers:', this.messageHandlers.size);
    this.reconnect = false;
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this._isConnected = false;
    this._isConnecting = false;
    this.messageHandlers.clear();
    this.errorHandlers.clear();
  }

  private setupMock(ws: WebSocket, isConnected: boolean): void {
    this.ws = ws;
    this._isConnected = isConnected;
  }

  static createPair(options?: WebSocketTransportOptions): { client: WebSocketTransport; server: WebSocketTransport } {
    const client = new WebSocketTransport({ ...options, url: 'mock://client', reconnect: false });
    const server = new WebSocketTransport({ ...options, url: 'mock://server', reconnect: false });

    const clientSend = (data: string) => {
      try {
        const message = JSON.parse(data);
        for (const handler of server.messageHandlers) {
          handler(message);
        }
      } catch { /* parse error */ }
    };

    const serverSend = (data: string) => {
      try {
        const message = JSON.parse(data);
        for (const handler of client.messageHandlers) {
          handler(message);
        }
      } catch { /* parse error */ }
    };

    const clientWs = {
      onopen: null as (() => void) | null,
      onmessage: null as ((event: { data: string }) => void) | null,
      onerror: null as ((error: unknown) => void) | null,
      onclose: null as (() => void) | null,
      close: () => {},
      send: clientSend,
    };

    const serverWs = {
      onopen: null as (() => void) | null,
      onmessage: null as ((event: { data: string }) => void) | null,
      onerror: null as ((error: unknown) => void) | null,
      onclose: null as (() => void) | null,
      close: () => {},
      send: serverSend,
    };

    client.setupMock(clientWs as unknown as WebSocket, true);
    server.setupMock(serverWs as unknown as WebSocket, true);

    return { client, server };
  }
}
