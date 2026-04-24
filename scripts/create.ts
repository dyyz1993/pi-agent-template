#!/usr/bin/env bun
/* eslint-disable no-console */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { resolve, join } from 'path';
import { execSync } from 'child_process';

const TEMPLATE_DIR = resolve(import.meta.dir, '..', 'template');
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
Usage: bun run create <project-name> [target-dir]

Examples:
  bun run create my-app
  bun run create my-app ../projects/my-app
`);
  process.exit(1);
}

const projectName = args[0].replace(/[^a-zA-Z0-9-_]/g, '-');
const targetDir = args[1] ? resolve(args[1]) : resolve(process.cwd(), projectName);

if (existsSync(targetDir)) {
  console.error(`Error: Directory "${targetDir}" already exists.`);
  process.exit(1);
}

const pascalName = projectName.replace(/(^|-)([a-z])/g, (_, _sep, c) => c.toUpperCase());
const identifier = `com.${projectName.replace(/-/g, '')}.app`;

console.log(`Creating project: ${projectName}`);
console.log(`Target directory: ${targetDir}`);
console.log(`App identifier:   ${identifier}`);
console.log('');

const SKIP_DIRS = new Set(['node_modules', 'build', 'dist', '.git', '.husky', '.trae', 'scripts']);
const SKIP_FILES = new Set(['bun.lock', 'rpc-browser.js']);

function copyAndReplace(srcDir: string, destDir: string): void {
  mkdirSync(destDir, { recursive: true });

  const entries = readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(srcDir, entry.name);
    const destPath = join(destDir, entry.name);

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      copyAndReplace(srcPath, destPath);
    } else {
      if (SKIP_FILES.has(entry.name)) continue;

      let content = readFileSync(srcPath, 'utf-8');

      content = content.replace(/pi-agent-template/g, projectName);
      content = content.replace(/pi-agent/g, projectName);
      content = content.replace(/Pi Agent/g, pascalName);
      content = content.replace(/com\.piagent\.template/g, identifier);
      content = content.replace(/com\.piagent/g, `com.${projectName.replace(/-/g, '')}`);
      content = content.replace(/@pi-agent\//g, `@chat-agent/`);

      writeFileSync(destPath, content);
    }
  }
}

copyAndReplace(TEMPLATE_DIR, targetDir);

// Remove Vite alias pointing to local packages/ (not needed in created project)
const viteConfigPath = join(targetDir, 'vite.config.ts');
if (existsSync(viteConfigPath)) {
  let viteConfig = readFileSync(viteConfigPath, 'utf-8');
  viteConfig = viteConfig.replace(/,\n\s+resolve:\s*\{\n\s+alias:\s*\{\n\s+[^}]+\n\s+\},\n\s+\},/g, '');
  viteConfig = viteConfig.replace(/import\s*\{\s*resolve\s*\}\s*from\s*"path";\n/g, '');
  writeFileSync(viteConfigPath, viteConfig);
}

// Resolve @dyyz1993/rpc-core version from npm (latest published)
let rpcCoreVersion = '1.0.0';
try {
  rpcCoreVersion = execSync('npm view @dyyz1993/rpc-core version', { encoding: 'utf-8' }).trim();
  console.log(`Using @dyyz1993/rpc-core@${rpcCoreVersion} from npm`);
} catch {
  console.log(`(npm lookup failed, falling back to @dyyz1993/rpc-core@${rpcCoreVersion})`);
}

// Update package.json: replace workspace:* with resolved npm version
const rootPkgPath = join(targetDir, 'package.json');
const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf-8'));
delete rootPkg.workspaces;
if (rootPkg.dependencies && rootPkg.dependencies['@dyyz1993/rpc-core']) {
  rootPkg.dependencies['@dyyz1993/rpc-core'] = `^${rpcCoreVersion}`;
}

writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, '\t') + '\n');

// Git init first so husky prepare can find .git during bun install
console.log('Initializing git...');
execSync('git init', { cwd: targetDir, stdio: 'pipe' });

console.log('Installing dependencies...');
execSync('bun install', { cwd: targetDir, stdio: 'inherit' });

console.log('Building browser bundle...');
try {
  execSync('bun run build:browser', { cwd: targetDir, stdio: 'pipe' });
} catch {
  console.log('(build:browser skipped - script not found)');
}

// Setup husky pre-commit hook
const huskyDir = join(targetDir, '.husky');
mkdirSync(huskyDir, { recursive: true });
const preCommitPath = join(huskyDir, 'pre-commit');
const preCommitContent = [
  '#!/bin/sh',
  'bun run lint',
  'ERRORS=$(npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "node_modules" || true)',
  'if [ -n "$ERRORS" ]; then',
  '  echo "$ERRORS"',
  '  exit 1',
  'fi',
].join('\n') + '\n';
writeFileSync(preCommitPath, preCommitContent);

execSync('git add -A', { cwd: targetDir, stdio: 'pipe' });

try {
  execSync(`git commit --no-verify -m "feat: init ${projectName} from pi-agent-template"`, { cwd: targetDir, stdio: 'pipe' });
} catch {
  console.log('(git commit skipped - no files to commit)');
}

console.log('');
console.log('Project created successfully!');
console.log('');
console.log('Next steps:');
console.log(`  cd ${targetDir}`);
console.log('  bun run dev          # Start desktop app (Electrobun)');
console.log('  bun run dev:web      # Start web mode (Vite + Gateway)');
console.log('');
