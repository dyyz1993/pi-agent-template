import { readFileSync, existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import type { PortEntry } from '../lib/types.js';

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

  let registry: Record<string, PortEntry>;
  try {
    const raw = readFileSync(registryPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      registry = {};
      for (const entry of parsed) {
        const key = entry.dir || entry.name || String(entry.port);
        registry[key] = entry;
      }
    } else {
      registry = parsed;
    }
  } catch {
    console.log('No active instances.\n');
    return;
  }

  const allEntries = Object.entries(registry);
  if (allEntries.length === 0) {
    console.log('No active instances.\n');
    return;
  }

  const aliveEntries = allEntries.filter(([, e]) => isPidAlive(e.pid));
  const cleaned = aliveEntries.length < allEntries.length;

  if (cleaned) {
    const cleanedRegistry: Record<string, PortEntry> = {};
    for (const [key, entry] of aliveEntries) {
      cleanedRegistry[key] = entry;
    }
    writeFileSync(registryPath, JSON.stringify(cleanedRegistry, null, 2) + '\n');
  }

  if (aliveEntries.length === 0) {
    console.log('No active instances.\n');
    return;
  }

  console.log('Active pi-agent instances:\n');
  for (const [dir, entry] of aliveEntries) {
    const uptime = getUptime(entry.startedAt);
    console.log(`  ${entry.name.padEnd(16)} →  http://localhost:${entry.port}  (PID ${entry.pid}, up ${uptime})`);
    console.log(`  ${dir}`);
    console.log('');
  }
  console.log(`Registry: ${registryPath}\n`);
}
