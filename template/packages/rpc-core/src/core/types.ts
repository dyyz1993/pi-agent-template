import type { RequestContext } from './context';

export type RPCMessage = RPCRequest | RPCResponse | RPCEvent | RPCSubscribe | RPCUnsubscribe;

export interface RPCRequest {
  id: string;
  type: 'request';
  method: string;
  params?: unknown;
  context?: RequestContext;
}

export interface RPCResponse {
  id: string;
  type: 'response';
  result?: unknown;
  error?: { code: number; message: string };
}

export interface RPCEvent<T = unknown> {
  id: string;
  type: 'event';
  eventType: string;
  payload: T;
  metadata?: Record<string, unknown>;
  timestamp?: number;
}

export interface RPCSubscribe {
  id: string;
  type: 'subscribe';
  eventType: string;
  filter?: Record<string, unknown>;
  context?: RequestContext;
}

export interface RPCUnsubscribe {
  id: string;
  type: 'unsubscribe';
  subscriptionId: string;
}

export type RPCHandler = (params?: unknown, context?: RequestContext) => Promise<unknown>;

export interface EventHandler<T = unknown> {
  (event: RPCEvent<T>): void;
}

export interface RPCLogger {
  debug?: (msg: string, ...args: unknown[]) => void;
  info?: (msg: string, ...args: unknown[]) => void;
  warn?: (msg: string, ...args: unknown[]) => void;
  error?: (msg: string, ...args: unknown[]) => void;
}
