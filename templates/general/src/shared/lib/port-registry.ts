/**
 * Global port registry — tracks all running pi-agent instances.
 *
 * File: ~/.pi-agent/ports.json
 *
 * Format:
 * {
 *   "/absolute/project/path": {
 *     "port": 3101,
 *     "pid": 12345,
 *     "startedAt": "2026-04-29T08:00:00.000Z",
 *     "name": "my-project"
 *   }
 * }
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, basename } from "path";
import { homedir } from "os";

const REGISTRY_DIR = join(homedir(), ".pi-agent");
const REGISTRY_FILE = join(REGISTRY_DIR, "ports.json");

export interface PortEntry {
  port: number;
  pid: number;
  startedAt: string;
  name: string;
}

export type PortRegistry = Record<string, PortEntry>;

function ensureDir() {
  if (!existsSync(REGISTRY_DIR)) {
    mkdirSync(REGISTRY_DIR, { recursive: true });
  }
}

export function readRegistry(): PortRegistry {
  try {
    if (!existsSync(REGISTRY_FILE)) return {};
    return JSON.parse(readFileSync(REGISTRY_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function writeRegistry(registry: PortRegistry): void {
  ensureDir();
  writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2), "utf-8");
}

export function registerPort(projectPath: string, port: number, name: string): void {
  const registry = readRegistry();
  registry[projectPath] = {
    port,
    pid: process.pid,
    startedAt: new Date().toISOString(),
    name: name || basename(projectPath),
  };
  writeRegistry(registry);
}

export function unregisterPort(projectPath: string): void {
  const registry = readRegistry();
  delete registry[projectPath];
  if (Object.keys(registry).length === 0) {
    writeRegistry(registry);
  } else {
    writeRegistry(registry);
  }
}

export function cleanupStaleEntries(): void {
  const registry = readRegistry();
  let changed = false;
  for (const [path, entry] of Object.entries(registry)) {
    try {
      process.kill(entry.pid, 0);
    } catch {
      delete registry[path];
      changed = true;
    }
  }
  if (changed) writeRegistry(registry);
}

export function formatRegistryForOutput(): string {
  cleanupStaleEntries();
  const registry = readRegistry();
  const entries = Object.entries(registry);
  if (entries.length === 0) return "No active instances.";

  const lines = entries.map(([path, entry]) => {
    const uptime = Math.round((Date.now() - new Date(entry.startedAt).getTime()) / 1000);
    const uptimeStr = uptime < 60 ? `${uptime}s` : uptime < 3600 ? `${Math.floor(uptime / 60)}m ${uptime % 60}s` : `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`;
    return `  ${entry.name}  →  http://localhost:${entry.port}  (PID ${entry.pid}, up ${uptimeStr})\n  ${path}`;
  });

  return `Active pi-agent instances (${entries.length}):\n${lines.join("\n\n")}\n\nRegistry: ${REGISTRY_FILE}`;
}

export { REGISTRY_FILE };
