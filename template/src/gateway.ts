import { TypedRPCServer, GatewayTransport, AuthMiddleware } from '../packages/rpc-core/src/index';
import type { PiAgentMethods, PiAgentEvents } from './schema';
import { logger } from './logger';

const GW_PORT = 3000;

const tokenValidator = async (token: string) => {
  if (token === 'test-secret-token') {
    return { source: 'remote' as const, userId: 'user-1', role: 'user' };
  }
  if (token.startsWith('user-')) {
    return { source: 'remote' as const, userId: token.slice(5), role: 'user' };
  }
  return null;
};

const gatewayTransport = new GatewayTransport({
  port: GW_PORT,
  auth: {
    validator: tokenValidator,
    tokenSources: ['query', 'header'],
    tokenKey: 'authorization',
  },
  fileServer: {
    basePath: process.cwd(),
    urlPrefix: '/files',
  },
  cors: {
    origins: ['http://localhost:8080', 'http://localhost:3000'],
    headers: ['Authorization', 'Content-Type'],
  },
});

const authMiddleware = new AuthMiddleware({
  validator: tokenValidator,
  localBypass: false,
});

const server = new TypedRPCServer<PiAgentMethods, PiAgentEvents>(gatewayTransport, {
  middleware: [authMiddleware],
  methods: {
    hello: async (params, context) => {
      const name = params?.name || 'World';
      logger.info({ method: 'hello', userId: context?.userId, source: context?.source }, 'RPC call');
      return { message: `Hello ${name}!`, timestamp: Date.now() };
    },
    echo: async (params) => params,
    ping: async (context) => ({ pong: true, timestamp: Date.now(), platform: context?.source || 'unknown' }),
  },
  events: {
    heartbeat: { payload: { serverTime: 0 }, metadata: { server: '', platform: '' } },
  },
});

setInterval(() => {
  server.emitEvent('heartbeat', { serverTime: Date.now() }, { server: 'pi-agent', platform: 'server' });
}, 5000);

logger.info({ port: GW_PORT }, 'Gateway server started with auth on port');
