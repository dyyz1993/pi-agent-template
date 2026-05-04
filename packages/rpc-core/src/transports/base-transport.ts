import type { MessageHandler, ErrorHandler, DisconnectHandler } from '../core/transport';

export class BaseTransport {
  protected messageHandlers = new Set<MessageHandler>();
  protected errorHandlers = new Set<ErrorHandler>();
  protected disconnectHandlers = new Set<DisconnectHandler>();
  protected _isConnected: boolean = false;

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

  protected emitMessage(message: unknown): void {
    for (const handler of this.messageHandlers) {
      handler(message);
    }
  }

  protected emitError(error: Error): void {
    for (const handler of this.errorHandlers) {
      handler(error);
    }
  }

  protected emitDisconnect(): void {
    for (const handler of this.disconnectHandlers) {
      handler();
    }
  }

  protected clearHandlers(): void {
    this.messageHandlers.clear();
    this.errorHandlers.clear();
    this.disconnectHandlers.clear();
  }
}
