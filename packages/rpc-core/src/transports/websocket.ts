import type { Transport, MessageHandler, ErrorHandler } from '../core/transport';

export interface WebSocketTransportOptions {
  url: string;
  onError?: (error: Error) => void;
}

export class WebSocketTransport implements Transport {
  private ws: WebSocket | null = null;
  private url: string;
  private messageHandlers: Set<MessageHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private onError?: (error: Error) => void;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;
  private connected = false;

  constructor(options: WebSocketTransportOptions) {
    this.url = options.url;
    this.onError = options.onError;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
        
        this.ws.onopen = () => {
          this.connected = true;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onclose = () => {
          this.connected = false;
          this.scheduleReconnect();
        };

        this.ws.onerror = (_event) => {
          const error = new Error('WebSocket error');
          this.errorHandlers.forEach(h => h(error));
          this.onError?.(error);
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.messageHandlers.forEach(h => h(message));
          } catch {
            // silently ignore parse errors
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().catch(() => {});
    }, this.reconnectInterval * this.reconnectAttempts);
  }

  async send(message: unknown): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    this.ws.send(JSON.stringify(message));
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  close(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }
}