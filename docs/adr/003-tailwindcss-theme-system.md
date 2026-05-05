# ADR-003: CSS Variables + TailwindCSS for Theming

## Status: Accepted

## Context

The application needs to support light and dark themes with runtime switching.

## Decision

Use CSS custom properties (variables) for all colors, combined with TailwindCSS `darkMode: 'class'` strategy.

## Rationale

1. **Runtime switching**: CSS variables can be changed instantly without rebuild
2. **TailwindCSS integration**: `bg-[var(--color-xxx)]` works seamlessly
3. **Dark class strategy**: Simple `document.documentElement.classList.toggle('dark')`
4. **Semantic naming**: `--color-bg-primary` instead of `--color-gray-900`
5. **No CSS-in-JS**: No runtime style generation overhead

## Alternatives Considered

- **TailwindCSS dark: prefix**: Requires rebuild, can't switch at runtime
- **CSS-in-JS (styled-components)**: Runtime overhead, bundle size
- **CSS Modules + variables**: More verbose, less ecosystem support

## Consequences

- ✅ Instant theme switching with no rebuild
- ✅ All colors in one place (index.css)
- ✅ Theme persisted in localStorage
- ⚠️ Need to maintain two sets of color values
- ⚠️ Long Tailwind class names with var()
