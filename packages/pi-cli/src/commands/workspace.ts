import { resolve } from 'path';
import { execSync } from 'child_process';
import { existsSync, readFileSync, mkdirSync } from 'fs';

const PORT_REGISTRY = resolve(process.env.HOME || '~', '.pi-agent', 'ports.json');

interface PortEntry {
  port: number;
  pid: number;
  startedAt: string;
  name: string;
}

function readRegistry(): Record<string, PortEntry> {
  try {
    return JSON.parse(readFileSync(PORT_REGISTRY, 'utf-8'));
  } catch {
    return {};
  }
}

function findFreePorts(entries: Record<string, PortEntry>): { backend: number; vite: number } {
  const usedPorts = new Set<number>();
  for (const entry of Object.values(entries)) {
    usedPorts.add(entry.port);
  }
  let backend = 3100;
  while (usedPorts.has(backend)) backend++;
  let vite = 5173;
  while (usedPorts.has(vite)) vite++;
  return { backend, vite };
}

export async function runWorkspace(args: string[]): Promise<void> {
  const subCommand = args[0];

  if (!subCommand || subCommand === '--help' || subCommand === '-h') {
    console.log(`
Usage: pi workspace add <name> [--base <branch>]

Creates an isolated git worktree in .workspace/<name> with its own branch and ports.

Options:
  --base <branch>  Base branch for the new worktree (default: current HEAD)

Examples:
  pi workspace add feature-chat-ui
  pi workspace add fix-login --base develop
`);
    return;
  }

  if (subCommand !== 'add') {
    console.error(`Unknown workspace subcommand: "${subCommand}"`);
    console.log('Usage: pi workspace add <name>');
    return;
  }

  let name = '';
  let baseBranch = '';
  const rest = args.slice(1);
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--base' && rest[i + 1]) {
      baseBranch = rest[++i];
    } else if (!rest[i].startsWith('--')) {
      name = rest[i];
    }
  }

  if (!name) {
    console.error('Error: workspace name is required');
    process.exit(1);
  }

  const projectRoot = process.cwd();
  const workspaceDir = resolve(projectRoot, '.workspace', name);

  if (existsSync(workspaceDir)) {
    console.error(`Error: workspace "${name}" already exists at ${workspaceDir}`);
    process.exit(1);
  }

  const branchName = `workspace/${name}`;
  const baseArg = baseBranch ? baseBranch : 'HEAD';

  console.log(`Creating workspace: ${name}`);
  console.log(`  Branch: ${branchName}`);
  console.log(`  Directory: .workspace/${name}`);

  mkdirSync(resolve(projectRoot, '.workspace'), { recursive: true });

  try {
    execSync(`git worktree add "${workspaceDir}" -b ${branchName} ${baseArg}`, {
      cwd: projectRoot,
      stdio: 'pipe',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Failed to create worktree: ${message}`);
    process.exit(1);
  }

  const registry = readRegistry();
  const ports = findFreePorts(registry);

  console.log(`  Backend port: ${ports.backend}`);
  console.log(`  Vite port:    ${ports.vite}`);
  console.log('');
  console.log('Installing dependencies...');
  try {
    execSync('bun install', { cwd: workspaceDir, stdio: 'pipe' });
  } catch {
    console.log('(bun install skipped)');
  }

  console.log('');
  console.log('Workspace created successfully!');
  console.log('');
  console.log('To start developing:');
  console.log(`  cd .workspace/${name}`);
  console.log(`  PORT=${ports.backend} VITE_PORT=${ports.vite} bun run dev:web`);
  console.log('');
  console.log('Or start from project root:');
  console.log(`  PORT=${ports.backend} VITE_PORT=${ports.vite} bun run dev:web`);
}
