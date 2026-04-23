#!/usr/bin/env bun
/* eslint-disable no-console */

/**
 * E2E integration test: creates a project from template, starts the web server,
 * and verifies HTTP endpoints + WebSocket RPC communication.
 *
 * Usage:
 *   bun run scripts/e2e-test.ts [project-dir]
 *
 * If project-dir is omitted, creates a temp project automatically.
 */

import { spawn, execSync } from "child_process";
import { existsSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";

const PORT = 3100;
const TOKEN = "pi-agent-template-token";
const WS_URL = `ws://localhost:${PORT}/?token=${TOKEN}`;
const TIMEOUT_MS = 15_000;

let projectDir: string;
let autoCreated = false;
let serverProcess: ReturnType<typeof spawn> | null = null;

// --- Helpers ---

function log(tag: string, msg: string) {
  console.log(`[${tag}] ${msg}`);
}

function fail(tag: string, msg: string): never {
  console.error(`\n[${tag}] FAIL: ${msg}\n`);
  cleanup(1);
  process.exit(1);
}

function cleanup(code: number) {
  if (serverProcess) {
    log("cleanup", "Stopping server...");
    serverProcess.kill("SIGTERM");
    serverProcess = null;
  }
  if (autoCreated && projectDir && existsSync(projectDir)) {
    log("cleanup", `Removing temp project: ${projectDir}`);
    try { rmSync(projectDir, { recursive: true, force: true }); } catch { /* ignore cleanup error */ }
  }
  if (code !== 0) process.exit(code);
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(maxWaitMs = 10_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await fetch(`http://localhost:${PORT}/health`);
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await sleep(200);
  }
  fail("wait", `Server did not start within ${maxWaitMs}ms`);
}

async function wsRpc(method: string, params: unknown): Promise<unknown> {
  const id = `rpc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const msg = JSON.stringify({ id, type: "request", method, params });

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`RPC timeout: ${method}`));
    }, TIMEOUT_MS);

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      ws.send(msg);
    };

    ws.onmessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data as string);
      if (data.id === id) {
        clearTimeout(timer);
        ws.close();
        resolve(data);
      }
    };

    ws.onerror = () => {
      clearTimeout(timer);
      reject(new Error(`WebSocket error: ${method}`));
    };
  });
}

// --- Main ---

async function main() {
  const arg = process.argv[2];

  if (arg) {
    projectDir = resolve(arg);
    if (!existsSync(join(projectDir, "package.json"))) {
      fail("setup", `${projectDir} does not look like a valid project`);
    }
    log("setup", `Using existing project: ${projectDir}`);
  } else {
    const tmpBase = mkdtempSync(join(tmpdir(), "e2e-test-"));
    projectDir = join(tmpBase, "e2e-app");
    autoCreated = true;
    log("setup", `Creating project at: ${projectDir}`);

    const rootDir = resolve(import.meta.dir, "..");
    execSync(`bun run create e2e-app ${projectDir}`, {
      cwd: rootDir,
      stdio: "pipe",
    });

    if (!existsSync(join(projectDir, "package.json"))) {
      fail("setup", "Project creation failed");
    }
    log("setup", "Project created successfully");
  }

  // Start server
  log("server", `Starting server in ${projectDir}...`);
  serverProcess = spawn("bun", ["run", "src/server.ts"], {
    cwd: projectDir,
    stdio: "pipe",
    env: { ...process.env },
  });

  serverProcess.on("error", (err) => {
    fail("server", `Failed to start: ${err.message}`);
  });

  await waitForServer();
  log("server", "Server is ready");

  // Run tests
  log("test", "Running integration tests...\n");

  let passed = 0;
  let failed = 0;

  // Test 1: Health endpoint (HTTP, no auth)
  {
    const res = await fetch(`http://localhost:${PORT}/health`);
    const body = (await res.json()) as Record<string, unknown>;
    if (body.status === "ok") {
      log("PASS", "GET /health → { status: 'ok' }");
      passed++;
    } else {
      log("FAIL", `GET /health → ${JSON.stringify(body)}`);
      failed++;
    }
  }

  // Test 2: Auth rejection (HTTP, wrong token)
  {
    const res = await fetch(`http://localhost:${PORT}/info/`, {
      headers: { Authorization: "Bearer wrong-token" },
    });
    if (res.status === 401) {
      log("PASS", "Wrong token → 401 Unauthorized");
      passed++;
    } else {
      log("FAIL", `Wrong token → ${res.status} (expected 401)`);
      failed++;
    }
  }

  // Test 3: Auth rejection (WebSocket, wrong token)
  {
    const authResult = await new Promise<string>((resolve) => {
      const ws = new WebSocket(`ws://localhost:${PORT}/?token=wrong-token`);
      const timer = setTimeout(() => resolve("timeout"), 5000);
      ws.onclose = (event: CloseEvent) => { clearTimeout(timer); resolve(`closed:${event.code}`); };
      ws.onerror = () => { clearTimeout(timer); resolve("error"); };
    });
    if (authResult === "closed:4001") {
      log("PASS", "WS wrong token → connection rejected (4001)");
      passed++;
    } else {
      log("FAIL", `WS wrong token → ${authResult} (expected closed:4001)`);
      failed++;
    }
  }

  // Test 4: RPC - system.ping via WebSocket
  {
    try {
      const data = (await wsRpc("system.ping", {})) as Record<string, unknown>;
      const result = data.result as Record<string, unknown> | undefined;
      if (result?.pong === true) {
        log("PASS", `system.ping → { pong: true, platform: "${result.platform}" }`);
        passed++;
      } else {
        log("FAIL", `system.ping → ${JSON.stringify(data)}`);
        failed++;
      }
    } catch (err) {
      log("FAIL", `system.ping → ${(err as Error).message}`);
      failed++;
    }
  }

  // Test 5: RPC - system.hello via WebSocket
  {
    try {
      const data = (await wsRpc("system.hello", { name: "E2E" })) as Record<string, unknown>;
      const result = data.result as Record<string, unknown> | undefined;
      if (result?.message === "Hello E2E!") {
        log("PASS", `system.hello → "${result.message}"`);
        passed++;
      } else {
        log("FAIL", `system.hello → ${JSON.stringify(data)}`);
        failed++;
      }
    } catch (err) {
      log("FAIL", `system.hello → ${(err as Error).message}`);
      failed++;
    }
  }

  // Test 6: RPC - system.echo via WebSocket
  {
    const payload = { array: [1, 2, 3], nested: { key: "value" } };
    try {
      const data = (await wsRpc("system.echo", payload)) as Record<string, unknown>;
      const result = data.result;
      if (JSON.stringify(result) === JSON.stringify(payload)) {
        log("PASS", "system.echo → payload echoed correctly");
        passed++;
      } else {
        log("FAIL", `system.echo → ${JSON.stringify(data)}`);
        failed++;
      }
    } catch (err) {
      log("FAIL", `system.echo → ${(err as Error).message}`);
      failed++;
    }
  }

  // Test 7: RPC - unknown method returns error
  {
    try {
      const data = (await wsRpc("nonexistent.method", {})) as Record<string, unknown>;
      if (data.error) {
        const errMsg = (data.error as Record<string, unknown>)?.message as string;
        log("PASS", `nonexistent.method → error: "${errMsg}"`);
        passed++;
      } else {
        log("FAIL", `nonexistent.method should error → ${JSON.stringify(data)}`);
        failed++;
      }
    } catch (err) {
      log("FAIL", `nonexistent.method → ${(err as Error).message}`);
      failed++;
    }
  }

  // Summary
  console.log(`\n${"=".repeat(40)}`);
  console.log(`E2E Results: ${passed} passed, ${failed} failed`);
  console.log("=".repeat(40));

  cleanup(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  fail("fatal", err instanceof Error ? err.message : String(err));
});
