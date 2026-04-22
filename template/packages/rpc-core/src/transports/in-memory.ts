import type { Transport, MessageHandler, DisconnectHandler } from '../core/transport';

export class InMemoryTransport implements Transport {
  private handlers: Set<MessageHandler> = new Set();
  private disconnectHandlers: Set<DisconnectHandler> = new Set();
  private paired: InMemoryTransport | null = null;
  private connected = true;

  pair(other: InMemoryTransport): void {
    this.paired = other;
    other.paired = this;
  }

  async send(message: unknown): Promise<void> {
    if (this.paired) {
      this.paired.handlers.forEach(h => h(message));
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  onDisconnect(handler: DisconnectHandler): () => void {
    this.disconnectHandlers.add(handler);
    return () => this.disconnectHandlers.delete(handler);
  }

  close(): void {
    this.handlers.clear();
    this.connected = false;
    this.disconnectHandlers.forEach(h => h());
    this.disconnectHandlers.clear();
  }

  isConnected(): boolean {
    return this.connected;
  }
}
