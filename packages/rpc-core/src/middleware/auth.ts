import type { Middleware, MiddlewareResult } from '../core/middleware';
import type { RPCMessage } from '../core/types';
import type { RequestContext } from '../core/context';
import { createLocalContext } from '../core/context';

export type TokenValidator = (token: string) => Promise<RequestContext | null>;

export class AuthMiddleware implements Middleware {
  private validator?: TokenValidator;
  private localBypass: boolean;

  constructor(options: { validator?: TokenValidator; localBypass?: boolean } = {}) {
    this.validator = options.validator;
    this.localBypass = options.localBypass ?? true;
  }

  process(message: RPCMessage): MiddlewareResult {
    if (message.type === 'response' || message.type === 'event') {
      return { allowed: true };
    }

    const ctx = (message as Record<string, unknown>).context as RequestContext | undefined;

    if (ctx?.source === 'local' && this.localBypass) {
      return { allowed: true, context: ctx };
    }

    if (ctx?.source === 'remote') {
      if (!this.validator) {
        return { allowed: true, context: ctx };
      }
      return { allowed: true, context: ctx };
    }

    return { allowed: false, error: { code: 401, message: 'Authentication required' } };
  }
}

export class LocalAuthMiddleware implements Middleware {
  private context: RequestContext;

  constructor(overrides?: Partial<RequestContext>) {
    this.context = createLocalContext(overrides);
  }

  process(message: RPCMessage): MiddlewareResult {
    if (message.type === 'response' || message.type === 'event') {
      return { allowed: true, context: this.context };
    }
    return { allowed: true, context: this.context };
  }
}
