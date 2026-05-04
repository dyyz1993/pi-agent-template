#!/usr/bin/env bun
/* eslint-disable no-console */

import { spawn, execSync } from "child_process";
import { existsSync, mkdtempSync, rmSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";

const MAX_WAIT_MS = 15_000;
const POLL_MS = 200;

let backendProc: ReturnType<typeof spawn> | null = null;
let viteProc: ReturnType<typeof spawn> | null = null;
let projectDir: string;
let autoCreated = false;

function log(tag: string, msg: string) {
  console.log(`[${tag}] ${msg}`);
}

function cleanup(code: number) {
  if (viteProc && !viteProc.killed) viteProc.kill("SIGTERM");
  if (backendProc && !backendProc.killed) backendProc.kill("SIGTERM");
  if (autoCreated && projectDir && existsSync(projectDir)) {
    try { rmSync(projectDir, { recursive: true, force: true }); } catch { /* ignore cleanup error */ }
  }
  if (code !== 0) process.exit(code);
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForFile(filePath: string, maxMs: number): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, "utf-8").trim();
        if (content) return content;
      } catch { /* ignore parse error */ }
    }
    await sleep(POLL_MS);
  }
  throw new Error(`Timed out waiting for ${filePath}`);
}

async function waitForUrl(url: string, maxMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 200) return;
    } catch { /* server not ready yet */ }
    await sleep(POLL_MS);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function main() {
  const rootDir = resolve(import.meta.dir, "..");

  const tmpBase = mkdtempSync(join(tmpdir(), "e2e-ui-"));
  projectDir = join(tmpBase, "e2e-ui-app");
  autoCreated = true;

  log("setup", `Creating project at: ${projectDir}`);
  execSync(`HUSKY=0 bun run create e2e-ui-app ${projectDir}`, { cwd: rootDir, stdio: "pipe" });
  if (!existsSync(join(projectDir, "package.json"))) {
    console.error("FAIL: Project creation failed");
    cleanup(1);
    return;
  }
  log("setup", "Project created");

  log("setup", "Installing dependencies...");
  execSync("bun install", { cwd: projectDir, stdio: "pipe" });
  log("setup", "Dependencies installed");

  const portFile = join(projectDir, ".server-port");

  log("server", "Starting backend...");
  backendProc = spawn("bun", ["src/server.ts"], {
    cwd: projectDir,
    stdio: ["pipe", "pipe", "pipe"],
  });
  backendProc.on("error", (err) => {
    console.error("Backend failed:", err.message);
    cleanup(1);
  });

  const backendPort = await waitForFile(portFile, 10_000);
  log("server", `Backend ready on port ${backendPort}`);

  log("vite", "Starting Vite dev server...");
  viteProc = spawn("vite", [], {
    cwd: projectDir,
    stdio: ["pipe", "pipe", "pipe"],
  });
  viteProc.on("error", (err) => {
    console.error("Vite failed:", err.message);
    cleanup(1);
  });

  await waitForUrl("http://localhost:5173", MAX_WAIT_MS);
  log("vite", "Vite dev server ready");

  log("test", "Running Playwright E2E UI tests...");
  try {
    execSync("npx playwright test", {
      cwd: rootDir,
      stdio: "inherit",
      env: { ...process.env },
      timeout: 60_000,
    });
    log("test", "Playwright tests PASSED");
  } catch {
    console.error("Playwright tests FAILED");
    cleanup(1);
    return;
  }

  cleanup(0);
}

main().catch((err) => {
  console.error("Fatal:", err instanceof Error ? err.message : String(err));
  cleanup(1);
});
