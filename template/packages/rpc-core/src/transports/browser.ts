import type { Transport, MessageHandler } from '../core/transport';

export interface BrowserTransportOptions {
  wsUrl?: string;
  token?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export class BrowserTransport implements Transport {
  readonly mode: 'ipc' | 'websocket';
  private ws: globalThis.WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private connected = false;
  private wsUrl: string;
  private token: string | undefined;
  private reconnectInterval: number;
  private maxReconnectAttempts: number;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options?: BrowserTransportOptions) {
    this.wsUrl = options?.wsUrl || 'ws://localhost:3000';
    this.token = options?.token;
    this.reconnectInterval = options?.reconnectInterval || 3000;
    this.maxReconnectAttempts = options?.maxReconnectAttempts || 10;

    const isElectrobun = typeof window !== 'undefined' && !!(window as Record<string, unknown>).__electrobunBunBridge;
    this.mode = isElectrobun ? 'ipc' : 'websocket';
    this.init();
  }

  private init(): void {
    if (this.mode === 'ipc') {
      this.initIPC();
    } else {
      this.initWebSocket();
    }
  }

  private initIPC(): void {
    const electrobun = (window as Record<string, unknown>).__electrobun as Record<string, unknown> | undefined;
    if (electrobun) {
      electrobun.receiveMessageFromBun = (msg: unknown) => {
        this.handleIncoming(msg);
      };
    }
    this.connected = true;
  }

  private buildWsUrl(): string {
    if (!this.token) return this.wsUrl;
    const separator = this.wsUrl.includes('?') ? '&' : '?';
    return `${this.wsUrl}${separator}token=${encodeURIComponent(this.token)}`;
  }

  private initWebSocket(): void {
    try {
      const url = this.buildWsUrl();
      this.ws = new globalThis.WebSocket(url);

      this.ws.onopen = () => {
        this.connected = true;
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data as string);
          this.handlers.forEach(h => h(message));
        } catch {
          // silently ignore parse errors
        }
      };

      this.ws.onclose = (event: CloseEvent) => {
        this.connected = false;
        if (event.code === 4001) {
          this.handlers.forEach(h => h({ type: 'auth-error', code: event.code, reason: event.reason }));
          return;
        }
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.connected = false;
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.initWebSocket();
    }, this.reconnectInterval);
  }

  private handleIncoming(msg: unknown): void {
    try {
      let message: unknown = null;
      if (typeof msg === 'string') {
        try { message = JSON.parse(msg); } catch { message = msg; }
      } else if (typeof msg === 'object' && msg !== null) {
        const m = msg as Record<string, unknown>;
        if (m.type === 'message' && m.id === 'rpc-message') {
          const payload = m.payload;
          if (typeof payload === 'string') {
            try { message = JSON.parse(payload); } catch { message = payload; }
          } else {
            message = payload;
          }
        } else {
          message = msg;
        }
      }
      if (message !== null) {
        this.handlers.forEach(h => h(message));
      }
    } catch {
      // silently ignore parse errors in handleIncoming
    }
  }

  getMode(): 'ipc' | 'websocket' {
    return this.mode;
  }

  setToken(token: string): void {
    this.token = token;
    if (this.mode === 'websocket') {
      this.close();
      this.connected = false;
      this.reconnectAttempts = 0;
      this.initWebSocket();
    }
  }

  async send(message: unknown): Promise<void> {
    if (this.mode === 'ipc') {
      const bridge = (window as Record<string, unknown>).__electrobunBunBridge as { postMessage: (msg: string) => void } | undefined;
      if (bridge) {
        const electrobunMsg = {
          type: 'message',
          id: 'rpc-message',
          payload: message
        };
        bridge.postMessage(JSON.stringify(electrobunMsg));
      }
    } else if (this.ws && this.ws.readyState === globalThis.WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  onDisconnect(): () => void {
    return () => {};
  }

  close(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.handlers.clear();
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }
}
