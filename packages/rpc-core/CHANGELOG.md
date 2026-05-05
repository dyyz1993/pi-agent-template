# @dyyz1993/rpc-core

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
  - pi-cli unit tests: 31 test cases
  - Smoke test: validates pi create → lint → test → build in created projects
  - E2E UI tests: Playwright with mock WebSocket for CI

  **Developer Skills (3 items):**

  - pi-rpc-module-dev: complete RPC module development workflow
  - pi-template-dev: template development and maintenance standards
  - pi-fullstack-debug: full-stack debugging guide
