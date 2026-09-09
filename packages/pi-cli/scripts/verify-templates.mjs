import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// pre-publish gate for @dyyz1993/create-agent. Validates that the templates
// bundled into the package are complete and post-processed; a stale or partial
// sync used to ship scaffolds that could not build.
const pkgDir = join(import.meta.dirname, '..');
const templates = ['general', 'chat', 'agent', 'browser-agent', 'cowork'];
const errors = [];

for (const name of templates) {
  const dir = join(pkgDir, 'templates', name);

  if (!existsSync(join(dir, 'src'))) {
    errors.push(`templates/${name}/src missing — run "pnpm sync-templates" first`);
  }

  if (existsSync(join(dir, 'eslint-plugin-rpc'))) {
    errors.push(`templates/${name}/eslint-plugin-rpc vendored copy still present (plugin ships on npm now)`);
  }

  const pkgPath = join(dir, 'package.json');
  if (existsSync(pkgPath)) {
    const pkg = readFileSync(pkgPath, 'utf-8');
    if (pkg.includes('workspace:*')) {
      errors.push(`templates/${name}/package.json still references workspace:*`);
    }
    if (!pkg.includes('"@dyyz1993/eslint-plugin-rpc"')) {
      errors.push(`templates/${name}/package.json missing @dyyz1993/eslint-plugin-rpc dependency`);
    }
  } else {
    errors.push(`templates/${name}/package.json missing`);
  }

  const eslintPath = join(dir, 'eslint.config.mjs');
  if (existsSync(eslintPath)) {
    const eslint = readFileSync(eslintPath, 'utf-8');
    if (eslint.includes("'./eslint-plugin-rpc/index.js'")) {
      errors.push(
        `templates/${name}/eslint.config.mjs imports the vendored copy instead of the npm package`
      );
    }
    if (!eslint.includes("'@dyyz1993/eslint-plugin-rpc'")) {
      errors.push(`templates/${name}/eslint.config.mjs does not import @dyyz1993/eslint-plugin-rpc`);
    }
  } else {
    errors.push(`templates/${name}/eslint.config.mjs missing`);
  }
}

if (!existsSync(join(pkgDir, 'templates', 'shared', 'vite-base.config.ts'))) {
  errors.push('templates/shared/vite-base.config.ts missing — generated projects cannot build');
}

if (errors.length > 0) {
  console.error('verify-templates: FAILED');
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log('verify-templates: ok');
