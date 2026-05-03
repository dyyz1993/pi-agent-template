#!/usr/bin/env bun

import { runCreate } from './commands/create.js';
import { runList } from './commands/list.js';
import { runStatus } from './commands/status.js';
import { runWorkspace } from './commands/workspace.js';

const COMMANDS = new Map<string, (args: string[]) => Promise<void>>([
  ['create', runCreate],
  ['list', runList],
  ['status', runStatus],
  ['workspace', runWorkspace],
]);

function printHelp(): void {
  console.log(`
Pi Agent CLI — project scaffolding tool

Usage:
  pi <command> [options]

Commands:
  create <name>  Create a new project from template
  list           Show available template types
  status         Show active pi-agent instances
  workspace add <name>  Create isolated workspace for parallel development
  update         Update project to latest template (coming soon)

Options:
  -h, --help     Show this help message

Run "pi create --help" for create-specific options.
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const command = args[0];
  const rest = args.slice(1);

  if (!command || command === '-h' || command === '--help') {
    printHelp();
    process.exit(0);
  }

  if (command === 'update') {
    console.log('Update feature coming soon');
    return;
  }

  const handler = COMMANDS.get(command);
  if (!handler) {
    console.error(`Unknown command: "${command}"\n`);
    printHelp();
    process.exit(1);
  }

  await handler(rest);
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
