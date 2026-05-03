import type { Transport, MessageHandler, ErrorHandler, DisconnectHandler } from '../core/transport';
import type { RPCLogger } from '../core/types';

export interface StdioTransportOptions {
  logger?: RPCLogger;
  stdin?: NodeJS.ReadStream | { on: (event: string, handler: (...args: unknown[]) => void) => void; resume: () => void };
  stdout?: NodeJS.WriteStream | { write: (data: string) => void };
}

export class StdioTransport implements Transport {
  private messageHandlers: Set<MessageHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private disconnectHandlers: Set<DisconnectHandler> = new Set();
  private _isConnected: boolean = false;
  private logger?: RPCLogger;
  private stdin: StdioTransportOptions['stdin'];
  private stdout: StdioTransportOptions['stdout'];
  private buffer: string = '';

  constructor(options?: StdioTransportOptions) {
    this.logger = options?.logger;
    this.stdin = options?.stdin ?? (typeof process !== 'undefined' ? process.stdin : undefined);
    this.stdout = options?.stdout ?? (typeof process !== 'undefined' ? process.stdout : undefined);
  }

  async connect(): Promise<void> {
    if (this._isConnected) return;

    if (!this.stdin) {
      throw new Error('No stdin available');
    }

    this._isConnected = true;

    (this.stdin as { resume: () => void }).resume();

    (this.stdin as { on: (event: string, handler: (...args: unknown[]) => void) => void }).on('data', (chunk: unknown) => {
      this.buffer += typeof chunk === 'string' ? chunk : Buffer.from(chunk as Uint8Array).toString('utf-8');
      const lines = this.buffer.split('\n');
      this.buffer = lines.pop()!;

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const message = JSON.parse(trimmed);
          this.logger?.debug?.('stdio recv', message);
          for (const handler of this.messageHandlers) {
            handler(message);
          }
        } catch (err) {
          this.logger?.error?.('Failed to parse stdin message', err);
          for (const handler of this.errorHandlers) {
            handler(err instanceof Error ? err : new Error(String(err)));
          }
        }
      }
    });

    (this.stdin as { on: (event: string, handler: (...args: unknown[]) => void) => void }).on('end', () => {
      this._isConnected = false;
      for (const handler of this.disconnectHandlers) {
        handler();
      }
    });

    (this.stdin as { on: (event: string, handler: (...args: unknown[]) => void) => void }).on('error', (err: unknown) => {
      this.logger?.error?.('stdin error', err);
      for (const handler of this.errorHandlers) {
        handler(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  async send(message: unknown): Promise<void> {
    if (!this.stdout) {
      throw new Error('No stdout available');
    }
    const line = JSON.stringify(message) + '\n';
    this.logger?.debug?.('stdio send', message);
    (this.stdout as { write: (data: string) => void }).write(line);
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

  onDisconnect(handler: DisconnectHandler): () => void {
    this.disconnectHandlers.add(handler);
    return () => {
      this.disconnectHandlers.delete(handler);
    };
  }

  isConnected(): boolean {
    return this._isConnected;
  }

  close(): void {
    this._isConnected = false;
    this.messageHandlers.clear();
    this.errorHandlers.clear();
    this.disconnectHandlers.clear();
    this.buffer = '';
  }

  static createPair(options?: StdioTransportOptions): { client: StdioTransport; server: StdioTransport } {
    let clientDataHandler: ((chunk: Buffer) => void) | null = null;
    let _clientEndHandler: (() => void) | null = null;
    let _clientErrorHandler: ((err: Error) => void) | null = null;
    let serverDataHandler: ((chunk: Buffer) => void) | null = null;
    let _serverEndHandler: (() => void) | null = null;
    let _serverErrorHandler: ((err: Error) => void) | null = null;

    const clientStdin = {
      on: (event: string, handler: (...args: unknown[]) => void) => {
        if (event === 'data') clientDataHandler = handler as (chunk: Buffer) => void;
        if (event === 'end') _clientEndHandler = handler as () => void;
        if (event === 'error') _clientErrorHandler = handler as (err: Error) => void;
      },
      resume: () => {},
    };

    const clientStdout = {
      write: (data: string) => {
        if (serverDataHandler) serverDataHandler(Buffer.from(data));
      },
    };

    const serverStdin = {
      on: (event: string, handler: (...args: unknown[]) => void) => {
        if (event === 'data') serverDataHandler = handler as (chunk: Buffer) => void;
        if (event === 'end') _serverEndHandler = handler as () => void;
        if (event === 'error') _serverErrorHandler = handler as (err: Error) => void;
      },
      resume: () => {},
    };

    const serverStdout = {
      write: (data: string) => {
        if (clientDataHandler) clientDataHandler(Buffer.from(data));
      },
    };

    const client = new StdioTransport({ ...options, stdin: clientStdin, stdout: clientStdout });
    const server = new StdioTransport({ ...options, stdin: serverStdin, stdout: serverStdout });

    client.connect();
    server.connect();

    return { client, server };
  }
}
