# @dyyz1993/rpc-core

## 2.2.1

### Patch Changes

- [`29d2171`](https://github.com/dyyz1993/pi-agent-template/commit/29d217148f6e0b496cc06716e11847b3e522e266) - Fix WebSocket double reconnect scheduling (orphan timers could resurrect connections after `close()`), make same-key subscriptions multicast with reference counting instead of silently overwriting handlers, and auto-resubscribe after reconnect via a new `onReconnect` transport hook. Pending requests now fail fast with `RPCDisconnectError` on disconnect, and server error codes are preserved on `RPCServerError.code`. Also: browser WebSocket disables heartbeat when ping is unsupported, IPC close notifies the peer, malformed subscribe messages are validated, stdio cleans up stdin listeners, and typed client filters are constrained to the event metadata type at compile time.

## 1.3.0

### Minor Changes

- Performance optimization, CI enhancement, and developer Skills

  **Performance (8 items):**
  - Lazy load secondary panels (React.lazy + Suspense) — first load reduced by 444KB
  - Split markdown/diff into independent chunks
  - Virtualize ChatPanel messages with @tanstack/react-virtual
  - Truncate and virtualize Bash output (5000 line limit)
  - MessageBubble React.memo
  - GitPanel selector merge with useShallow (20+ → 3 groups)
  - RPC request cache layer (TTL-based, 9 cacheable methods)
  - Vite build optimization (es2020 + cssMinify + compact)

  **CI Enhancement (3 items):**
  - Enhanced build-verify: structure check → install → build → dist verification
  - Full RPC API E2E test: ~30 endpoints per template
  - create-agent unit tests: 31 test cases
  - Smoke test: validates create-agent create → lint → test → build in created projects
  - E2E UI tests: Playwright with mock WebSocket for CI

  **Developer Skills (3 items):**
  - pi-rpc-module-dev: complete RPC module development workflow
  - pi-template-dev: template development and maintenance standards
  - pi-fullstack-debug: full-stack debugging guide
