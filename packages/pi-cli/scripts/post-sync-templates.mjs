import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const templatesDir = join(import.meta.dirname, '..', 'templates');
const templateNames = ['agent', 'browser-agent', 'chat', 'general'];

for (const name of templateNames) {
  const configPath = join(templatesDir, name, 'eslint.config.mjs');
  let content = readFileSync(configPath, 'utf-8');

  content = content.replace(
    "import rpcPlugin from '@dyyz1993/eslint-plugin-rpc';",
    "import rpcPlugin from './eslint-plugin-rpc/index.js';"
  );

  content = content.replace(
    /'node_modules\/\*\*',\n\s+'build\/\*\*',\n\s+'dist\/\*\*',\n/,
    "'node_modules/**',\n      'build/**',\n      'dist/**',\n      'eslint-plugin-rpc/**',\n"
  );

  writeFileSync(configPath, content);

  const pkgPath = join(templatesDir, name, 'package.json');
  let pkg = readFileSync(pkgPath, 'utf-8');
  pkg = pkg.replace(/\t"@dyyz1993\/eslint-plugin-rpc": "workspace:\*",\n\t/g, '\t');
  writeFileSync(pkgPath, pkg);
}

console.log('post-sync-templates: reverted eslint-plugin-rpc to local imports in pi-cli templates');
