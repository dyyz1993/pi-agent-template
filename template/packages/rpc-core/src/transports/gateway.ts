import type { Transport, MessageHandler, DisconnectHandler } from '../core/transport';
import type { RequestContext } from '../core/context';
import type { TokenValidator } from '../middleware/auth';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

export interface GatewayTransportOptions {
  port: number;
  auth: {
    validator: TokenValidator;
    tokenSources?: ('query' | 'header' | 'cookie')[];
    tokenKey?: string;
  };
  fileServer?: {
    basePath: string;
    urlPrefix?: string;
  };
  cors?: {
    origins?: string[];
    headers?: string[];
  };
}

interface AuthenticatedClient {
  id: string;
  ws: WebSocket;
  context: RequestContext;
}

export class GatewayTransport implements Transport {
  private options: GatewayTransportOptions;
  private httpServer: ReturnType<typeof createServer>;
  private wss: WebSocketServer;
  private clients: Map<string, AuthenticatedClient> = new Map();
  private requestClientMap: Map<string, string> = new Map();
  private messageHandlers: Set<MessageHandler> = new Set();
  private disconnectHandlers: Set<DisconnectHandler> = new Set();
  private connected = false;
  private nextClientId = 0;

  constructor(options: GatewayTransportOptions) {
    this.options = options;
    this.httpServer = createServer((req, res) => this.handleHttpRequest(req, res));
    this.wss = new WebSocketServer({ server: this.httpServer });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleWSConnection(ws, req);
    });

    this.httpServer.listen(options.port);
  }

  private async extractToken(req: IncomingMessage): Promise<string | null> {
    const sources = this.options.auth.tokenSources || ['query', 'header'];
    const key = this.options.auth.tokenKey || 'authorization';

    if (sources.includes('query')) {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token') || url.searchParams.get(key);
      if (token) return token;
    }

    if (sources.includes('header')) {
      const header = req.headers[key] || req.headers[key.toLowerCase()];
      if (typeof header === 'string') {
        return header.startsWith('Bearer ') ? header.slice(7) : header;
      }
    }

    if (sources.includes('cookie')) {
      const cookieHeader = req.headers.cookie;
      if (cookieHeader) {
        const match = cookieHeader.split(';').find(c => c.trim().startsWith(`${key}=`));
        if (match) return match.split('=')[1].trim();
      }
    }

    return null;
  }

  private async authenticateWS(ws: WebSocket, req: IncomingMessage): Promise<RequestContext | null> {
    const token = await this.extractToken(req);
    if (!token) return null;

    const context = await this.options.auth.validator(token);
    return context;
  }

  private async handleWSConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
    const context = await this.authenticateWS(ws, req);
    if (!context) {
      ws.close(4001, 'Authentication failed');
      return;
    }

    const clientId = `gw-client-${++this.nextClientId}`;
    this.clients.set(clientId, { id: clientId, ws, context });
    this.connected = true;

    ws.on('message', (data: Buffer | string) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'request' && message.id) {
          this.requestClientMap.set(message.id, clientId);
        }
        if (!message.context) {
          message.context = context;
        }
        this.messageHandlers.forEach(h => h(message));
      } catch {
        // ignore parse errors
      }
    });

    ws.on('close', () => {
      this.clients.delete(clientId);
      if (this.clients.size === 0) {
        this.connected = false;
        this.disconnectHandlers.forEach(h => h());
      }
    });
  }

  private async handleHttpRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (this.options.cors) {
      const origin = req.headers.origin;
      if (origin && this.options.cors.origins?.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Headers', this.options.cors.headers?.join(', ') || 'Authorization, Content-Type');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      }

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }
    }

    const token = await this.extractToken(req);
    if (!token) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Authentication required' }));
      return;
    }

    const context = await this.options.auth.validator(token);
    if (!context) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid token' }));
      return;
    }

    if (this.options.fileServer) {
      const urlPrefix = this.options.fileServer.urlPrefix || '/files';
      const url = new URL(req.url || '/', `http://${req.headers.host}`);

      if (url.pathname.startsWith(urlPrefix)) {
        const filePath = url.pathname.slice(urlPrefix.length);
        await this.serveFile(filePath, req, res, context);
        return;
      }
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }

  private async serveFile(filePath: string, _req: IncomingMessage, res: ServerResponse, _context: RequestContext): Promise<void> {
    try {
      const basePath = this.options.fileServer!.basePath;
      const normalizedPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
      const fullPath = `${basePath}/${normalizedPath}`;
      const file = Bun.file(fullPath);

      if (!(await file.exists())) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'File not found' }));
        return;
      }

      const contentType = file.type || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(await file.arrayBuffer());
    } catch {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
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

    if (msg.type === 'event' && msg.eventType) {
      for (const [, client] of this.clients) {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(data);
        }
      }
      return;
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

  onDisconnect(handler: DisconnectHandler): () => void {
    this.disconnectHandlers.add(handler);
    return () => this.disconnectHandlers.delete(handler);
  }

  close(): void {
    this.clients.forEach(c => c.ws.close());
    this.clients.clear();
    this.requestClientMap.clear();
    this.wss.close();
    this.httpServer.close();
    this.messageHandlers.clear();
    this.disconnectHandlers.clear();
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getClientContext(clientId: string): RequestContext | undefined {
    return this.clients.get(clientId)?.context;
  }
}
