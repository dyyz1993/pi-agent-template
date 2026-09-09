# @dyyz1993/create-agent

## 2.1.3

### Patch Changes

- Refresh bundled templates: corrected `@dyyz1993/rpc-core` tsconfig paths (general/chat), typed subscribe filters and debug handler signatures, `@shared/*` path mapping that includes `src/shared`, and tsconfig excludes for shared config files. Generated projects now pass `tsc --noEmit` cleanly in pre-commit hooks.

## 2.1.2

### Patch Changes

- [`f3097a7`](https://github.com/dyyz1993/pi-agent-template/commit/f3097a7f32ed12a8d131637e8a9f5b179f329a50) - Fix the publish pipeline: `sync-templates` is now a looped script that also syncs `templates/shared`, excludes `.env`/lockfiles/machine-local files, and asserts every post-sync rewrite; `prepublishOnly` validates bundled templates via `scripts/verify-templates.mjs`. `update --force` now runs the same post-processing as create (no more `workspace:*` written back into user projects), dry-run diffs the rendered template instead of raw placeholders, and both shell injections in `workspace`/`update` are fixed (execFileSync + name whitelist). create finishes with `bun run prepare` instead of `pnpm`, prechecks git/bun, rewrites the project `package.json` name, rejects invalid/sanitized-to-garbage names, errors on unknown flags or missing option values (no more silent fallback to general), expands `~` in `--dir`, and copies binary files without utf-8 corruption.

## 1.9.0

### Minor Changes

- Rename package from @dyyz1993/pi-cli to @dyyz1993/create-agent
  - CLI command: `pi` → `create-agent`
  - Usage: `create-agent create my-app --type agent`
  - Usage: `npx @dyyz1993/create-agent create my-app`
  - Old package @dyyz1993/pi-cli is deprecated

## 1.8.0

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
