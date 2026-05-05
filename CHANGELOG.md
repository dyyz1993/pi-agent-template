# Changelog

## [Unreleased]

### Added
- Theme system: light/dark mode with CSS variables and TailwindCSS dark mode
- i18n internationalization: en/zh support with react-i18next
- ThemeToggle and LanguageSwitcher components
- Path security validation for RPC file handlers (path-security.ts)
- Bash command restriction with configurable blacklist (bash-security.ts)
- CORS configurable origin (no longer hardcoded *)
- Token validation with timingSafeEqual (timing attack prevention)
- React ErrorBoundary for crash recovery
- WebSocket heartbeat (ping/pong) with exponential backoff reconnection
- SSE auto-reconnect with subscription recovery
- BaseTransport abstract class to reduce transport code duplication
- ESLint `no-hardcoded-strings` rule for i18n enforcement
- eslint-plugin-rpc extracted as workspace package (eliminated 5 copies)
- Shared vite/vitest base configs (eliminated 255 lines duplication)
- Shared http-routes.ts (eliminated 690 lines duplication)
- Async logger with write queue and log rotation
- commitlint for conventional commit messages

### Changed
- App.tsx refactored: 288 → 38 lines (agent), 284 → 38 lines (general)
- use-app-store split into use-connection-store + use-log-store + use-app-store
- ExplorerSidebar: removed 16 props, reads directly from Zustand store
- subscribe parameter order unified to (event, handler, filter?)
- CI test:rpc now runs all 8 test files (was only 1)
- pre-commit hook optimized with lint-staged
- All hardcoded colors replaced with CSS variables for theme support
- All hardcoded UI strings replaced with i18n t() calls

### Fixed
- Server error handling: no longer silently swallows exceptions
- Client event handler errors no longer block other subscribers
- WebSocket reconnect setTimeout now properly cleaned up on close
- SSE reader loop sets isConnected=false on unexpected disconnect
- pi-cli templates fully synced with source templates

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
