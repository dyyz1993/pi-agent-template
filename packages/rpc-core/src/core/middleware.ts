import type { RPCMessage } from './types';
import type { RequestContext } from './context';

export interface MiddlewareResult {
  allowed: boolean;
  context?: RequestContext;
  error?: { code: number; message: string };
}

export interface Middleware {
  process(message: RPCMessage): Promise<MiddlewareResult> | MiddlewareResult;
}

export type MiddlewareChain = Middleware[];
