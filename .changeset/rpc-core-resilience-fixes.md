---
"@dyyz1993/rpc-core": patch
---

Fix WebSocket double reconnect scheduling (orphan timers could resurrect connections after `close()`), make same-key subscriptions multicast with reference counting instead of silently overwriting handlers, and auto-resubscribe after reconnect via a new `onReconnect` transport hook. Pending requests now fail fast with `RPCDisconnectError` on disconnect, and server error codes are preserved on `RPCServerError.code`. Also: browser WebSocket disables heartbeat when ping is unsupported, IPC close notifies the peer, malformed subscribe messages are validated, stdio cleans up stdin listeners, and typed client filters are constrained to the event metadata type at compile time.
