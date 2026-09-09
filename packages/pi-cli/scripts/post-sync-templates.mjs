import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// After sync-templates copies repo templates into the package, pin the
// workspace references to real versions so bundled templates install
// @dyyz1993/rpc-core and @dyyz1993/eslint-plugin-rpc from npm. Every rewrite
// is asserted: a silent no-op here is exactly how the package drifted into a
// broken state before.
const pkgDir = join(import.meta.dirname, '..');
const templatesDir = join(pkgDir, 'templates');
const templateNames = ['agent', 'browser-agent', 'chat', 'cowork', 'general'];
const failures = [];

const internalVersions = {
  '@dyyz1993/rpc-core': JSON.parse(
    readFileSync(join(pkgDir, '..', 'rpc-core', 'package.json'), 'utf-8')
  ).version,
  '@dyyz1993/eslint-plugin-rpc': JSON.parse(
    readFileSync(join(pkgDir, '..', 'eslint-plugin-rpc', 'package.json'), 'utf-8')
  ).version,
};

for (const name of templateNames) {
  const pkgPath = join(templatesDir, name, 'package.json');
  let pkg = readFileSync(pkgPath, 'utf-8');

  for (const [depName, version] of Object.entries(internalVersions)) {
    const before = pkg;
    pkg = pkg.replace(
      new RegExp(`^(\\t+)"${depName}": "workspace:\\*",`, 'gm'),
      `$1"${depName}": "^${version}",`
    );
    if (pkg === before) {
      failures.push(`${name}/package.json: workspace reference to ${depName} not found`);
    }
  }

  writeFileSync(pkgPath, pkg);
}

if (failures.length > 0) {
  console.error('post-sync-templates: rewrite failed (template format changed?):');
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}

console.log(
  `post-sync-templates: pinned internal deps to npm versions in bundled templates`,
  internalVersions
);
