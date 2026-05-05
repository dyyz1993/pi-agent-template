# ADR-001: Custom RPC Framework over REST API

## Status: Accepted

## Context

We need a communication layer between the React frontend and Bun backend that works in both desktop (Electrobun IPC) and web (WebSocket) modes.

## Decision

We built a custom type-safe RPC framework (`@dyyz1993/rpc-core`) with a Transport abstraction layer instead of using REST APIs.

## Rationale

1. **Dual-mode support**: Same code runs in desktop (IPC) and web (WebSocket) mode with zero changes
2. **Type safety**: Full TypeScript inference from method definition to client call
3. **Event streaming**: Built-in pub/sub for real-time events (chat, bash output, timer ticks)
4. **Transport abstraction**: 5 transports (IPC, WebSocket, SSE, Stdio, InMemory) with identical API
5. **Minimal overhead**: No HTTP semantics overhead for local IPC communication

## Alternatives Considered

- **REST API**: Too heavy for IPC, no built-in event streaming
- **tRPC**: Tied to HTTP, doesn't support IPC transport
- **GraphQL**: Overkill for desktop apps, adds complexity
- **Raw WebSocket**: No type safety, no method routing

## Consequences

- ✅ Full type safety from server to client
- ✅ Zero-code transport switching
- ✅ Built-in event subscription system
- ⚠️ Custom framework requires maintenance
- ⚠️ Not interoperable with standard HTTP tools
