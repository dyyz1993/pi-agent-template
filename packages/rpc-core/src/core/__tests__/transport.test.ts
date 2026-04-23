import { describe, it, expect } from 'vitest';
import type { Transport, MessageHandler, ErrorHandler, DisconnectHandler } from '../transport';

describe('Transport Interface', () => {
  it('should define Transport interface with required methods', () => {
    const mockTransport: Transport = {
      send: async (_message: unknown) => {},
      onMessage: (_handler: MessageHandler) => () => {},
      onError: (_handler: ErrorHandler) => () => {},
      isConnected: () => true,
      close: () => {},
    };

    expect(mockTransport.isConnected()).toBe(true);
    expect(typeof mockTransport.send).toBe('function');
    expect(typeof mockTransport.onMessage).toBe('function');
    expect(typeof mockTransport.onError).toBe('function');
    expect(typeof mockTransport.close).toBe('function');
  });

  it('should support optional onDisconnect handler', () => {
    const mockTransport: Transport = {
      send: async (_message: unknown) => {},
      onMessage: (_handler: MessageHandler) => () => {},
      onError: (_handler: ErrorHandler) => () => {},
      onDisconnect: (_handler: DisconnectHandler) => () => {},
      isConnected: () => true,
      close: () => {},
    };

    expect(typeof mockTransport.onDisconnect).toBe('function');
  });

  it('should return unsubscribe function from onMessage', () => {
    const mockTransport: Transport = {
      send: async (_message: unknown) => {},
      onMessage: (_handler: MessageHandler) => () => {},
      onError: (_handler: ErrorHandler) => () => {},
      isConnected: () => true,
      close: () => {},
    };

    const unsubscribe = mockTransport.onMessage(() => {});
    expect(typeof unsubscribe).toBe('function');
  });

  it('should return unsubscribe function from onError', () => {
    const mockTransport: Transport = {
      send: async (_message: unknown) => {},
      onMessage: (_handler: MessageHandler) => () => {},
      onError: (_handler: ErrorHandler) => () => {},
      isConnected: () => true,
      close: () => {},
    };

    const unsubscribe = mockTransport.onError(() => {});
    expect(typeof unsubscribe).toBe('function');
  });

  it('should return unsubscribe function from onDisconnect', () => {
    const mockTransport: Transport = {
      send: async (_message: unknown) => {},
      onMessage: (_handler: MessageHandler) => () => {},
      onError: (_handler: ErrorHandler) => () => {},
      onDisconnect: (_handler: DisconnectHandler) => () => {},
      isConnected: () => true,
      close: () => {},
    };

    const unsubscribe = mockTransport.onDisconnect!(() => {});
    expect(typeof unsubscribe).toBe('function');
  });
});

describe('Transport Type Aliases', () => {
  it('should accept MessageHandler function', () => {
    const handler: MessageHandler = (message: unknown) => {
      console.log('Message received:', message);
    };
    expect(typeof handler).toBe('function');
  });

  it('should accept ErrorHandler function', () => {
    const handler: ErrorHandler = (error: Error) => {
      console.error('Error:', error);
    };
    expect(typeof handler).toBe('function');
  });

  it('should accept DisconnectHandler function', () => {
    const handler: DisconnectHandler = () => {
      console.log('Disconnected');
    };
    expect(typeof handler).toBe('function');
  });
});
