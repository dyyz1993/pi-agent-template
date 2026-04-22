import type { Transport, MessageHandler } from '../core/transport';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

export interface WSServerTransportOptions {
  port: number;
}

interface WSClient {
  id: string;
  ws: WebSocket;
}

export class WSServerTransport implements Transport {
  private wss: WebSocketServer;
  private clients: Map<string, WSClient> = new Map();
  private requestClientMap: Map<string, string> = new Map();
  private messageHandlers: Set<MessageHandler> = new Set();
  private connected = false;
  private nextClientId = 0;

  constructor(options: WSServerTransportOptions) {
    const server = createServer();
    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = `client-${++this.nextClientId}`;
      this.clients.set(clientId, { id: clientId, ws });
      this.connected = true;

      ws.on('message', (data: Buffer | string) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === 'request' && message.id) {
            this.requestClientMap.set(message.id, clientId);
          }
          this.messageHandlers.forEach(h => h(message));
        } catch {
          // silently ignore parse errors
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        if (this.clients.size === 0) this.connected = false;
      });
    });

    server.listen(options.port, () => {
    });
  }

  async send(message: unknown): Promise<void> {
    const msg = message as Record<string, unknown>;
    const data = JSON.stringify(message);

    if (msg.type === 'response' && msg.id) {
      const clientId = this.requestClientMap.get(msg.id as string);
      this.requestClientMap.delete(msg.id as string);
      if (clientId) {
        const client = this.clients.get(clientId);
        if (client && client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(data);
          return;
        }
      }
    }

    for (const [, client] of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onDisconnect(): () => void {
    return () => {};
  }

  close(): void {
    this.clients.forEach(c => c.ws.close());
    this.clients.clear();
    this.requestClientMap.clear();
    this.wss.close();
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }
}
