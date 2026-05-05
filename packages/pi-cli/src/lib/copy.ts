import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';

const SKIP_DIRS = new Set(['node_modules', 'build', 'dist', '.git', '.husky', '.trae']);
const SKIP_FILES = new Set(['bun.lock', 'rpc-browser.js']);

export interface CopyOptions {
  projectName: string;
  templateDir: string;
  targetDir: string;
}

export function deriveNames(projectName: string) {
  const pascalName = projectName.replace(/(^|-)([a-z])/g, (_, _sep, c) => c.toUpperCase());
  const identifier = `com.${projectName.replace(/-/g, '')}.app`;
  const shortId = `com.${projectName.replace(/-/g, '')}`;
  return { pascalName, identifier, shortId };
}

export function copyAndReplace(srcDir: string, destDir: string, projectName: string): void {
  const { pascalName, identifier, shortId } = deriveNames(projectName);

  mkdirSync(destDir, { recursive: true });

  const entries = readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(srcDir, entry.name);
    const destPath = join(destDir, entry.name);

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      copyAndReplace(srcPath, destPath, projectName);
    } else {
      if (SKIP_FILES.has(entry.name)) continue;

      let content = readFileSync(srcPath, 'utf-8');

      content = content.replace(/pi-agent-template/g, projectName);
      content = content.replace(/Pi Agent Template/g, pascalName);
      content = content.replace(/Pi Agent/g, pascalName);
      content = content.replace(/com\.piagent\.template/g, identifier);
      content = content.replace(/com\.piagent/g, shortId);
      content = content.replace(/@pi-agent\//g, `@${projectName}/`);

      writeFileSync(destPath, content);
    }
  }
}

function copyTraeRules(monorepoRoot: string, targetDir: string, projectName: string): void {
  const traeRulesDir = resolve(monorepoRoot, '.trae', 'rules');
  if (!existsSync(traeRulesDir)) return;

  const destRulesDir = join(targetDir, '.trae', 'rules');
  mkdirSync(destRulesDir, { recursive: true });

  const files = readdirSync(traeRulesDir).filter((f) => f !== 'memory.md');
  for (const file of files) {
    const src = join(traeRulesDir, file);
    const dest = join(destRulesDir, file);
    let content = readFileSync(src, 'utf-8');
    content = content.replace(/pi-agent-template/g, projectName);
    writeFileSync(dest, content);
  }
}

function cleanViteConfig(targetDir: string): void {
  const viteConfigPath = join(targetDir, "vite.config.ts");
  if (!existsSync(viteConfigPath)) return;

  let viteConfig = readFileSync(viteConfigPath, "utf-8");
  viteConfig = viteConfig.replace(
    /,\n\s+resolve:\s*\{\n\s+alias:\s*\{[^}]*\}[,\s]*\}[,;]?\n/g,
    ""
  );
  if (!viteConfig.includes('from "path"') && (viteConfig.includes("resolve(") || viteConfig.includes("__dirname"))) {
    viteConfig = 'import { resolve } from "path";\n' + viteConfig;
  }
  writeFileSync(viteConfigPath, viteConfig);
}

function resolvePackageVersion(packageName: string): string {
  try {
    return execSync(`npm view ${packageName} version`, { encoding: 'utf-8' }).trim();
  } catch {
    return '1.0.0';
  }
}

const WORKSPACE_PACKAGES = [
  '@dyyz1993/rpc-core',
  '@dyyz1993/eslint-plugin-rpc',
];

function updatePackageJson(targetDir: string, _projectName: string): void {
  const rootPkgPath = join(targetDir, 'package.json');
  if (!existsSync(rootPkgPath)) return;

  const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf-8'));

  delete rootPkg.workspaces;

  for (const depKey of ['dependencies', 'devDependencies'] as const) {
    if (!rootPkg[depKey]) continue;
    for (const pkgName of WORKSPACE_PACKAGES) {
      if (rootPkg[depKey][pkgName] === 'workspace:*') {
        const version = resolvePackageVersion(pkgName);
        rootPkg[depKey][pkgName] = `^${version}`;
      }
    }
  }

  writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, '\t') + '\n');
}

export async function copyTemplate(options: CopyOptions): Promise<void> {
  const { projectName, templateDir, targetDir } = options;
  const localRoot = resolve(import.meta.dir, '..', '..', '..', '..');
  const isMonorepo = existsSync(resolve(localRoot, 'templates', 'general'));

  if (existsSync(targetDir)) {
    throw new Error(`Directory "${targetDir}" already exists.`);
  }

  const { identifier } = deriveNames(projectName);

  console.log(`Creating project: ${projectName}`);
  console.log(`Target directory: ${targetDir}`);
  console.log(`App identifier:   ${identifier}`);
  console.log('');

  copyAndReplace(templateDir, targetDir, projectName);
  if (isMonorepo) {
    copyTraeRules(localRoot, targetDir, projectName);
  }
  cleanViteConfig(targetDir);
  updatePackageJson(targetDir, projectName);

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

  const huskyDir = join(targetDir, '.husky');
  mkdirSync(huskyDir, { recursive: true });
  writeFileSync(
    join(huskyDir, 'pre-commit'),
    [
      '#!/bin/sh',
      'bun run lint',
      'ERRORS=$(bunx tsc --noEmit 2>&1 | grep "error TS" | grep -v "node_modules" || true)',
      'if [ -n "$ERRORS" ]; then',
      '  echo "$ERRORS"',
      '  exit 1',
      'fi',
    ].join('\n') + '\n',
  );

  execSync('git add -A', { cwd: targetDir, stdio: 'pipe' });

  try {
    execSync(`git commit --no-verify -m "feat: init ${projectName} from pi-agent-template"`, {
      cwd: targetDir,
      stdio: 'pipe',
    });
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
}
