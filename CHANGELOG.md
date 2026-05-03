# Changelog

## rpc-core@1.1.0 (2026-05-03)

### Features
- Add SSETransport with real HTTP server (Bun.serve + fetch + SSE stream)
- Add simulateDisconnect/simulateReconnect for network recovery testing
- Add createPair() to IPC, Stdio, WebSocket transports for unified testing
- Add 46-case parameterized test suite for all 5 transports
- Add 15-case SSE disconnect/reconnect test suite

### Bug Fixes
- Fix IPC transport: implement real bidirectional send via peer
- Fix WebSocket transport: clear handlers on close
- Fix RPCServer: swallow async handleMessage errors

## pi-cli@1.7.0 (2026-05-01)

### Features
- Add workspace command for isolated parallel development
- Add status command to show active instances

## rpc-core@1.0.3 (2026-04-29)

### Bug Fixes
- Fix subscription filter matching
- Fix timeout handling for slow handlers
