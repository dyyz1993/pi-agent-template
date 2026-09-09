---
"@dyyz1993/create-agent": patch
---

Fix the publish pipeline: `sync-templates` is now a looped script that also syncs `templates/shared`, excludes `.env`/lockfiles/machine-local files, and asserts every post-sync rewrite; `prepublishOnly` validates bundled templates via `scripts/verify-templates.mjs`. `update --force` now runs the same post-processing as create (no more `workspace:*` written back into user projects), dry-run diffs the rendered template instead of raw placeholders, and both shell injections in `workspace`/`update` are fixed (execFileSync + name whitelist). create finishes with `bun run prepare` instead of `pnpm`, prechecks git/bun, rewrites the project `package.json` name, rejects invalid/sanitized-to-garbage names, errors on unknown flags or missing option values (no more silent fallback to general), expands `~` in `--dir`, and copies binary files without utf-8 corruption.
