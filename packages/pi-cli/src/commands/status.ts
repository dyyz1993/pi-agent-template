import { readFileSync, existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';

interface PortEntry {
  name: string;
  port: number;
  pid: number;
  dir: string;
  startedAt: string;
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function getUptime(startedAt: string): string {
  const start = new Date(startedAt).getTime();
  if (isNaN(start)) return 'unknown';
  const diff = Date.now() - start;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (hours < 24) return `${hours}h ${remMinutes}m`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return `${days}d ${remHours}h`;
}

export async function runStatus(): Promise<void> {
  const registryPath = resolve(process.env.HOME || '~', '.pi-agent', 'ports.json');

  if (!existsSync(registryPath)) {
    console.log('No active instances.\n');
    return;
  }

  let entries: PortEntry[];
  try {
    const raw = readFileSync(registryPath, 'utf-8');
    entries = JSON.parse(raw);
  } catch {
    console.log('No active instances.\n');
    return;
  }

  if (!Array.isArray(entries) || entries.length === 0) {
    console.log('No active instances.\n');
    return;
  }

  const alive = entries.filter((e) => isPidAlive(e.pid));
  const cleaned = alive.length < entries.length;

  if (cleaned) {
    writeFileSync(registryPath, JSON.stringify(alive, null, 2) + '\n');
  }

  if (alive.length === 0) {
    console.log('No active instances.\n');
    return;
  }

  console.log('Active pi-agent instances:\n');
  for (const entry of alive) {
    const uptime = getUptime(entry.startedAt);
    console.log(`  ${entry.name.padEnd(16)} →  http://localhost:${entry.port}  (PID ${entry.pid}, up ${uptime})`);
    console.log(`  ${entry.dir}`);
    console.log('');
  }
  console.log(`Registry: ${registryPath}\n`);
}
