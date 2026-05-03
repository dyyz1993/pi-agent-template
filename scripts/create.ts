#!/usr/bin/env bun
/* eslint-disable no-console */

import { resolve } from 'path';
import { execSync } from 'child_process';

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

const cliPath = resolve(import.meta.dir, '..', 'packages', 'pi-cli', 'src', 'cli.ts');
execSync(`bun ${cliPath} create ${args.join(' ')}`, { stdio: 'inherit' });
