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

// The eslint plugin ships on npm (@dyyz1993/eslint-plugin-rpc); no vendored
// copy is bundled. post-sync pins its workspace reference to a real version.
execFileSync('node', [join(import.meta.dirname, 'post-sync-templates.mjs')], {
  stdio: 'inherit',
});

console.log('sync-templates: done');
