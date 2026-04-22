import { RPCClient } from './client';
import { BrowserTransport } from './transports/browser';
import { InMemoryTransport } from './transports/in-memory';

export { RPCClient, BrowserTransport, InMemoryTransport };

if (typeof window !== 'undefined') {
  (window as Record<string, unknown>).PiRPC = { RPCClient, BrowserTransport, InMemoryTransport };
}
