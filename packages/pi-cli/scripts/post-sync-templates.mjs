import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// After sync-templates copies repo templates into the package, point each
// template's eslint config at the vendored plugin copy and drop the workspace
// dependency. Every rewrite is asserted: a silent no-op here is exactly how
// the package drifted into a broken state before.
const templatesDir = join(import.meta.dirname, '..', 'templates');
const templateNames = ['agent', 'browser-agent', 'chat', 'cowork', 'general'];

const failures = [];

for (const name of templateNames) {
  const configPath = join(templatesDir, name, 'eslint.config.mjs');
  let content = readFileSync(configPath, 'utf-8');

  const beforeImport = content;
  content = content.replace(
    /import rpcPlugin from ['"]@dyyz1993\/eslint-plugin-rpc['"];?/,
    "import rpcPlugin from './eslint-plugin-rpc/index.js';"
  );
  if (content === beforeImport) {
    failures.push(`${name}/eslint.config.mjs: @dyyz1993/eslint-plugin-rpc import not found`);
  }

  if (!content.includes("'eslint-plugin-rpc/**'")) {
    content = content.replace(/(\s*)'node_modules\/\*\*',/, `$1'node_modules/**',$1'eslint-plugin-rpc/**',`);
  }

  writeFileSync(configPath, content);

  const pkgPath = join(templatesDir, name, 'package.json');
  let pkg = readFileSync(pkgPath, 'utf-8');
  const beforePkg = pkg;
  pkg = pkg.replace(/^\t+"@dyyz1993\/eslint-plugin-rpc": "workspace:\*",\n/gm, '');
  if (pkg === beforePkg && pkg.includes('@dyyz1993/eslint-plugin-rpc')) {
    failures.push(`${name}/package.json: workspace dependency line not removed`);
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

console.log('post-sync-templates: vendored eslint-plugin-rpc into pi-cli templates');
