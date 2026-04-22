import type { Transport, MessageHandler } from '../core/transport';
import type { RPCMessage } from '../core/types';

export interface ElectrobunTransportOptions {
  webView: {
    send: (channel: string, data: unknown) => void;
  };
}

export class ElectrobunTransport implements Transport {
  private handlers: Set<MessageHandler> = new Set();
  private webView: ElectrobunTransportOptions['webView'] | null = null;
  private connected = true;

  setWebView(webView: ElectrobunTransportOptions['webView']): void {
    this.webView = webView;
  }

  handleMessage(message: unknown): void {
    const msg = message as RPCMessage;
    if (msg.type === 'request' || msg.type === 'subscribe') {
      msg.context = { source: 'local', userId: 'local-user', role: 'admin' };
    }
    this.handlers.forEach(h => h(msg));
  }

  async send(message: unknown): Promise<void> {
    if (this.webView) {
      this.webView.send('rpc-message', message);
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
    this.handlers.clear();
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }
}
