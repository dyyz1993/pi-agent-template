import { describe, test, expect, afterAll } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { copyAndReplace, deriveNames } from '../lib/copy';

const TMP_DIRS: string[] = [];

afterAll(() => {
  for (const d of TMP_DIRS) {
    if (existsSync(d)) rmSync(d, { recursive: true, force: true });
  }
});

function makeTmp(prefix = 'pi-cli-test-'): string {
  const d = mkdtempSync(join(tmpdir(), prefix));
  TMP_DIRS.push(d);
  return d;
}

describe('deriveNames', () => {
  test('simple name', () => {
    const names = deriveNames('my-app');
    expect(names.pascalName).toBe('MyApp');
    expect(names.identifier).toBe('com.myapp.app');
    expect(names.shortId).toBe('com.myapp');
  });

  test('single word', () => {
    const names = deriveNames('hello');
    expect(names.pascalName).toBe('Hello');
    expect(names.identifier).toBe('com.hello.app');
    expect(names.shortId).toBe('com.hello');
  });

  test('multi-segment name', () => {
    const names = deriveNames('my-cool-project');
    expect(names.pascalName).toBe('MyCoolProject');
    expect(names.identifier).toBe('com.mycoolproject.app');
    expect(names.shortId).toBe('com.mycoolproject');
  });
});

describe('copyAndReplace', () => {
  test('copies files from src to dest', () => {
    const srcDir = makeTmp('pi-src-');
    const destDir = makeTmp('pi-dest-');

    writeFileSync(join(srcDir, 'hello.txt'), 'hello world');

    copyAndReplace(srcDir, destDir, 'test-project');

    expect(existsSync(join(destDir, 'hello.txt'))).toBe(true);
    expect(readFileSync(join(destDir, 'hello.txt'), 'utf-8')).toBe('hello world');
  });

  test('replaces pi-agent-template with project name', () => {
    const srcDir = makeTmp('pi-src-');
    const destDir = makeTmp('pi-dest-');

    writeFileSync(join(srcDir, 'config.json'), '{"name": "pi-agent-template"}');

    copyAndReplace(srcDir, destDir, 'my-app');

    const content = readFileSync(join(destDir, 'config.json'), 'utf-8');
    expect(content).toBe('{"name": "my-app"}');
  });

  test('replaces Pi Agent Template with pascal name', () => {
    const srcDir = makeTmp('pi-src-');
    const destDir = makeTmp('pi-dest-');

    writeFileSync(join(srcDir, 'readme.md'), '# Pi Agent Template');

    copyAndReplace(srcDir, destDir, 'my-app');

    const content = readFileSync(join(destDir, 'readme.md'), 'utf-8');
    expect(content).toBe('# MyApp');
  });

  test('replaces Pi Agent with pascal name', () => {
    const srcDir = makeTmp('pi-src-');
    const destDir = makeTmp('pi-dest-');

    writeFileSync(join(srcDir, 'app.ts'), 'export const Pi Agent = true');

    copyAndReplace(srcDir, destDir, 'cool-project');

    const content = readFileSync(join(destDir, 'app.ts'), 'utf-8');
    expect(content).toBe('export const CoolProject = true');
  });

  test('replaces com.piagent.template with identifier', () => {
    const srcDir = makeTmp('pi-src-');
    const destDir = makeTmp('pi-dest-');

    writeFileSync(join(srcDir, 'plist.xml'), '<string>com.piagent.template</string>');

    copyAndReplace(srcDir, destDir, 'my-app');

    const content = readFileSync(join(destDir, 'plist.xml'), 'utf-8');
    expect(content).toBe('<string>com.myapp.app</string>');
  });

  test('replaces com.piagent with shortId', () => {
    const srcDir = makeTmp('pi-src-');
    const destDir = makeTmp('pi-dest-');

    writeFileSync(join(srcDir, 'config.xml'), '<id>com.piagent.something</id>');

    copyAndReplace(srcDir, destDir, 'my-app');

    const content = readFileSync(join(destDir, 'config.xml'), 'utf-8');
    expect(content).toBe('<id>com.myapp.something</id>');
  });

  test('replaces @pi-agent/ scope', () => {
    const srcDir = makeTmp('pi-src-');
    const destDir = makeTmp('pi-dest-');

    writeFileSync(join(srcDir, 'pkg.json'), '"@pi-agent/rpc-core"');

    copyAndReplace(srcDir, destDir, 'my-app');

    const content = readFileSync(join(destDir, 'pkg.json'), 'utf-8');
    expect(content).toBe('"@my-app/rpc-core"');
  });

  test('skips node_modules directory', () => {
    const srcDir = makeTmp('pi-src-');
    const destDir = makeTmp('pi-dest-');

    mkdirSync(join(srcDir, 'node_modules', 'pkg'), { recursive: true });
    writeFileSync(join(srcDir, 'node_modules', 'pkg', 'index.js'), 'module.exports = 1;');
    writeFileSync(join(srcDir, 'root.txt'), 'root');

    copyAndReplace(srcDir, destDir, 'test');

    expect(existsSync(join(destDir, 'root.txt'))).toBe(true);
    expect(existsSync(join(destDir, 'node_modules'))).toBe(false);
  });

  test('skips bun.lock file', () => {
    const srcDir = makeTmp('pi-src-');
    const destDir = makeTmp('pi-dest-');

    writeFileSync(join(srcDir, 'bun.lock'), 'lockfile content');
    writeFileSync(join(srcDir, 'package.json'), '{}');

    copyAndReplace(srcDir, destDir, 'test');

    expect(existsSync(join(destDir, 'package.json'))).toBe(true);
    expect(existsSync(join(destDir, 'bun.lock'))).toBe(false);
  });

  test('copies nested directories recursively', () => {
    const srcDir = makeTmp('pi-src-');
    const destDir = makeTmp('pi-dest-');

    mkdirSync(join(srcDir, 'src', 'lib'), { recursive: true });
    writeFileSync(join(srcDir, 'src', 'lib', 'util.ts'), '// pi-agent-template util');

    copyAndReplace(srcDir, destDir, 'my-proj');

    const content = readFileSync(join(destDir, 'src', 'lib', 'util.ts'), 'utf-8');
    expect(content).toBe('// my-proj util');
  });
});
