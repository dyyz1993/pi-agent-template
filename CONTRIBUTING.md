# Contributing to Pi Agent Template

## Development Setup

### Prerequisites
- Node.js 22+
- pnpm 9+
- Bun 1.0+

### Quick Start

```bash
# Clone the repo
git clone https://github.com/dyyz1993/pi-agent-template.git
cd pi-agent-template

# Install dependencies
pnpm install

# Run tests
bun run test:rpc          # RPC core tests (321 tests)
cd templates/agent && npx vitest run  # Agent template tests
```

## Project Structure

```
packages/
  rpc-core/     # Type-safe RPC framework
  pi-cli/       # CLI scaffolding tool
templates/
  agent/        # Coding Agent template
  chat/         # Chat template
  general/      # Full-featured template
  shared/       # Shared configs and utilities
```

## Development Workflow

### 1. Create a branch
```bash
git checkout -b feat/my-feature
```

### 2. Follow TDD
1. Write failing tests first (Red)
2. Implement minimum code to pass (Green)
3. Refactor for quality (Refactor)

### 3. Commit Convention
We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(scope): description
fix(scope): description
docs: description
refactor: description
test: description
chore: description
```

### 4. Pre-commit Checks
Husky runs automatically:
- lint-staged (ESLint on staged files)
- TypeScript type-check on core packages

### 5. CI Pipeline
All PRs run through:
- ESLint
- TypeScript type-check
- Unit tests (rpc-core + templates)
- Integration tests
- E2E UI tests (Playwright)

## Code Style

### TypeScript
- Strict mode enabled
- No `any` without justification
- Use interfaces for object types

### React
- Use Zustand for state management
- Use `t()` for all UI text (i18n)
- Use CSS variables for all colors (theme)
- Extract hooks for complex logic

### RPC
- Follow `modules/` + `handlers/` pattern
- Method naming: `module.action`
- See `.trae/rules/rpc-conventions.md` for full spec

## Adding a New RPC Module

1. Create `shared/modules/your-module.ts` (type definitions)
2. Create `shared/handlers/your-module.ts` (implementation)
3. Export from `shared/handlers/index.ts`
4. Add to `shared/rpc-schema.ts` extends chain
5. Write tests

## Testing

```bash
# RPC core
cd packages/rpc-core && bun test tests/

# Template tests
cd templates/<template> && npx vitest run

# E2E
cd /path/to/root && npx playwright test
```
