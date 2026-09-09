import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

// Sync repo-root templates into the pi-cli package so they ship with the
// published create-agent CLI. Run from the repo root: pnpm sync-templates
const repoRoot = join(import.meta.dirname, '..', '..', '..');
const pkgTemplatesDir = join(repoRoot, 'packages', 'pi-cli', 'templates');

const TEMPLATES = ['general', 'chat', 'agent', 'browser-agent', 'cowork'];

// Files that belong to template development but must never ship in the npm
// package (secrets, lockfiles, machine-local state, heavy dirs).
const EXCLUDES = [
  'node_modules',
  'dist',
  'build',
  '.server-port',
  'logs',
  'bun.lock',
  'pnpm-lock.yaml',
  '.DS_Store',
  'coverage',
  'test-results',
  'e2e-ui-results',
  '.playwright',
  '.env',
  '.husky',
];

function rsync(from, to, excludes) {
  execFileSync(
    'rsync',
    ['-a', '--delete', ...excludes.flatMap((e) => ['--exclude', e]), `${from}/`, `${to}/`],
    { stdio: 'inherit' }
  );
}

console.log(`sync-templates: syncing into ${pkgTemplatesDir}`);

for (const name of TEMPLATES) {
  rsync(join(repoRoot, 'templates', name), join(pkgTemplatesDir, name), EXCLUDES);
}

// templates/shared is required by every generated project (vite/vitest base
// configs); forgetting it used to produce scaffolds that cannot build.
rsync(join(repoRoot, 'templates', 'shared'), join(pkgTemplatesDir, 'shared'), EXCLUDES);

// Vendor the shared eslint plugin into each template (post-sync rewrites the
// import path to this copy). Excludes matter here too: a local node_modules
// in packages/eslint-plugin-rpc would otherwise be published wholesale, and
// tests/README are not needed by generated projects.
for (const name of TEMPLATES) {
  rsync(
    join(repoRoot, 'packages', 'eslint-plugin-rpc'),
    join(pkgTemplatesDir, name, 'eslint-plugin-rpc'),
    ['node_modules', '.DS_Store', 'tests', 'README.md']
  );
}

execFileSync('node', [join(import.meta.dirname, 'post-sync-templates.mjs')], {
  stdio: 'inherit',
});

console.log('sync-templates: done');
