import { TypedRPCServer, WSServerTransport, AuthMiddleware } from '@chat-agent/rpc-core';
import type { PiAgentMethods, PiAgentEvents } from './schema';
import { logger } from './logger';

const WS_PORT = 3000;

const auth = new AuthMiddleware({ localBypass: true });
const wsTransport = new WSServerTransport({ port: WS_PORT });
const server = new TypedRPCServer<PiAgentMethods, PiAgentEvents>(wsTransport, {
  middleware: [auth],
  methods: {
    hello: async (params) => {
      const name = params?.name || 'World';
      return { message: `Hello ${name}!`, timestamp: Date.now() };
    },
    echo: async (params) => params,
    ping: async () => ({ pong: true, timestamp: Date.now(), platform: 'web' }),
  },
  events: {
    heartbeat: { payload: { serverTime: 0 }, metadata: { server: '', platform: '' } },
  },
});

logger.info({ port: WS_PORT, methods: ['hello', 'echo', 'ping'] }, 'RPC Server started on WebSocket');

setInterval(() => {
  server.emitEvent('heartbeat', { serverTime: Date.now() }, { server: 'pi-agent', platform: 'web' });
}, 5000);
