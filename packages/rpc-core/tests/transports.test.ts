import { InMemoryTransport, StdioTransport, IPCTransport, WebSocketTransport, SSETransport } from '../src/index';
import { runTransportSuite } from './transport-suites';

runTransportSuite('InMemory', () => InMemoryTransport.createPair());

runTransportSuite('Stdio', () => StdioTransport.createPair());

runTransportSuite('IPC', () => IPCTransport.createPair());

runTransportSuite('WebSocket', () => WebSocketTransport.createPair());

runTransportSuite('HTTP+SSE', () => SSETransport.createPair());
