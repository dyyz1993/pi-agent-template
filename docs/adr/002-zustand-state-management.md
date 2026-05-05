# ADR-002: Zustand for State Management

## Status: Accepted

## Context

React application needs state management for connection status, UI state, and RPC data caching.

## Decision

Use Zustand as the state management library with a multi-store architecture.

## Rationale

1. **Minimal boilerplate**: No providers, reducers, or actions boilerplate
2. **Selective re-rendering**: `useStore(s => s.field)` pattern avoids unnecessary renders
3. **Small bundle size**: ~1KB vs Redux (~7KB)
4. **TypeScript native**: Full type inference out of the box
5. **Store splitting**: Each feature gets its own store (connection, chat, explorer, etc.)

## Alternatives Considered

- **Redux Toolkit**: Too much boilerplate, provider requirement
- **Jotai**: Atomic model doesn't fit well with RPC data caching
- **Recoil**: Experimental status, Facebook dependency
- **Context API**: Re-render issues, not suitable for frequent updates

## Consequences

- ✅ Minimal boilerplate, easy to understand
- ✅ No provider wrapping needed
- ✅ Each store is independently testable
- ⚠️ No built-in devtools (can add separately)
