import type { Transport, MessageHandler, ErrorHandler, DisconnectHandler } from '../core/transport';
import type { RPCLogger } from '../core/types';

export interface SSETransportOptions {
  url?: string;
  logger?: RPCLogger;
  reconnect?: boolean;
  reconnectInterval?: number;
  timeout?: number;
}

export class SSETransport implements Transport {
  private messageHandlers: Set<MessageHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private disconnectHandlers: Set<DisconnectHandler> = new Set();
  private logger?: RPCLogger;
  private _isConnected: boolean = false;
  private httpServer: ReturnType<typeof Bun.serve> | null = null;
  private sseController: ReadableStreamDefaultController | null = null;
  private baseUrl: string = '';
  private closed = false;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private sseReadyResolve: (() => void) | null = null;
  private sseReady: Promise<void> = Promise.resolve();

  constructor(options?: SSETransportOptions) {
    this.logger = options?.logger;
  }

  private resetSseReady(): void {
    this.sseReady = new Promise<void>((resolve) => {
      this.sseReadyResolve = resolve;
    });
  }

  private startReaderLoop(response: Response): void {
    const reader = response.body!.getReader();
    this.reader = reader;
    const decoder = new TextDecoder();
    let buffer = '';

    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buffer.indexOf('\n\n')) !== -1) {
            const chunk = buffer.substring(0, idx);
            buffer = buffer.substring(idx + 2);
            for (const line of chunk.split('\n')) {
              if (line.startsWith('data: ')) {
                try {
                  const message = JSON.parse(line.slice(6));
                  for (const handler of [...this.messageHandlers]) {
                    handler(message);
                  }
                } catch { /* ignore parse errors */ }
              }
            }
          }
        }
      } catch { /* reader closed */ }

      if (!this.closed) {
        for (const handler of [...this.disconnectHandlers]) {
          handler();
        }
      }
    })();
  }

  static async createPair(options?: SSETransportOptions): Promise<{ server: SSETransport; client: SSETransport }> {
    const serverTransport = new SSETransport(options);
    const clientTransport = new SSETransport(options);

    serverTransport.resetSseReady();

    const httpServer = Bun.serve({
      port: 0,
      fetch(req) {
        const url = new URL(req.url);

        if (url.pathname === '/sse') {
          const body = new ReadableStream({
            start(controller) {
              serverTransport.sseController = controller;
              controller.enqueue(new TextEncoder().encode(':ok\n\n'));
              serverTransport.sseReadyResolve?.();
            },
          });

          return new Response(body, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            },
          });
        }

        if (url.pathname === '/rpc' && req.method === 'POST') {
          return req.json().then(message => {
            for (const handler of [...serverTransport.messageHandlers]) {
              handler(message);
            }
            return new Response('ok', { status: 200 });
          }).catch(() => new Response('bad request', { status: 400 }));
        }

        return new Response('not found', { status: 404 });
      },
    });

    serverTransport.httpServer = httpServer;
    const address = httpServer.url.toString().replace(/\/$/, '');
    serverTransport.baseUrl = address;
    serverTransport._isConnected = true;
    clientTransport.baseUrl = address;
    clientTransport._isConnected = true;

    const sseResponse = await fetch(`${address}/sse`);
    await serverTransport.sseReady;

    clientTransport.startReaderLoop(sseResponse);

    return { server: serverTransport, client: clientTransport };
  }

  simulateDisconnect(clientTransport?: SSETransport): void {
    if (this.sseController) {
      try { this.sseController.close(); } catch { /* already closed */ }
      this.sseController = null;
    }
    this._isConnected = false;
    if (clientTransport) {
      clientTransport._isConnected = false;
    }
    for (const handler of [...this.disconnectHandlers]) {
      handler();
    }
    if (clientTransport) {
      for (const handler of [...clientTransport.disconnectHandlers]) {
        handler();
      }
    }
  }

  async simulateReconnect(clientTransport: SSETransport): Promise<void> {
    this.resetSseReady();

    const sseResponse = await fetch(`${this.baseUrl}/sse`);
    await this.sseReady;

    this._isConnected = true;
    clientTransport._isConnected = true;

    clientTransport.reader?.cancel().catch(() => {});
    clientTransport.reader = null;

    clientTransport.startReaderLoop(sseResponse);
  }

  async send(message: unknown): Promise<void> {
    if (!this._isConnected) {
      throw new Error('SSE Transport is not connected');
    }

    if (this.sseController && !this.closed) {
      const data = JSON.stringify(message);
      this.sseController.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
      return;
    }

    if (this.baseUrl) {
      await fetch(`${this.baseUrl}/rpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });
      return;
    }

    throw new Error('SSE Transport not initialized');
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => { this.messageHandlers.delete(handler); };
  }

  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => { this.errorHandlers.delete(handler); };
  }

  onDisconnect(handler: DisconnectHandler): () => void {
    this.disconnectHandlers.add(handler);
    return () => { this.disconnectHandlers.delete(handler); };
  }

  isConnected(): boolean {
    return this._isConnected;
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this._isConnected = false;

    if (this.sseController) {
      try { this.sseController.close(); } catch { /* already closed */ }
      this.sseController = null;
    }

    if (this.reader) {
      try { this.reader.cancel(); } catch { /* reader closed */ }
      this.reader = null;
    }

    if (this.httpServer) {
      this.httpServer.stop();
      this.httpServer = null;
    }

    this.messageHandlers.clear();
    this.errorHandlers.clear();
    this.disconnectHandlers.clear();
  }
}
