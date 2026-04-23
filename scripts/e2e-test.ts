#!/usr/bin/env bun
/* eslint-disable no-console */

/**
 * E2E integration test: creates a project from template, starts the web server,
 * connects via WebSocket, and verifies RPC communication works.
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
  process.exit(1); // TypeScript needs this even though cleanup may exit
}

function cleanup(code: number) {
  if (serverProcess) {
    log("cleanup", "Stopping server...");
    serverProcess.kill("SIGTERM");
    serverProcess = null;
  }
  if (autoCreated && projectDir && existsSync(projectDir)) {
    log("cleanup", `Removing temp project: ${projectDir}`);
    rmSync(projectDir, { recursive: true, force: true });
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

async function wsSendRecv(messages: Record<string, unknown>[]): Promise<Map<string, unknown>> {
  const { WebSocket } = await import("ws");

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    const results = new Map<string, unknown>();
    let received = 0;

    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("WebSocket timeout"));
    }, TIMEOUT_MS);

    ws.on("open", () => {
      for (const msg of messages) {
        ws.send(JSON.stringify(msg));
      }
    });

    ws.on("message", (data: Buffer) => {
      const msg = JSON.parse(data.toString());
      if (msg.id) {
        results.set(msg.id, msg);
        received++;
        if (received === messages.length) {
          clearTimeout(timer);
          ws.close();
          resolve(results);
        }
      }
    });

    ws.on("error", (err: Error) => {
      clearTimeout(timer);
      reject(err);
    });
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

  // Run RPC tests
  log("test", "Running RPC integration tests...\n");

  let passed = 0;
  let failed = 0;

  // Test 1: system.ping
  {
    const pingId = "test-ping-1";
    const results = await wsSendRecv([
      { id: pingId, type: "request", method: "system.ping", params: {} },
    ]);
    const res = results.get(pingId) as Record<string, unknown> | undefined;
    if (res && (res.result as Record<string, unknown>)?.pong === true) {
      log("PASS", "system.ping → { pong: true }");
      passed++;
    } else {
      log("FAIL", `system.ping → ${JSON.stringify(res)}`);
      failed++;
    }
  }

  // Test 2: system.hello
  {
    const helloId = "test-hello-1";
    const results = await wsSendRecv([
      { id: helloId, type: "request", method: "system.hello", params: { name: "E2E" } },
    ]);
    const res = results.get(helloId) as Record<string, unknown> | undefined;
    const result = res?.result as Record<string, unknown> | undefined;
    if (result && result.message === "Hello E2E!") {
      log("PASS", `system.hello → "${result.message}"`);
      passed++;
    } else {
      log("FAIL", `system.hello → ${JSON.stringify(res)}`);
      failed++;
    }
  }

  // Test 3: system.echo
  {
    const echoId = "test-echo-1";
    const echoPayload = { array: [1, 2, 3], nested: { key: "value" } };
    const results = await wsSendRecv([
      { id: echoId, type: "request", method: "system.echo", params: echoPayload },
    ]);
    const res = results.get(echoId) as Record<string, unknown> | undefined;
    const result = res?.result as Record<string, unknown> | undefined;
    if (result && JSON.stringify(result) === JSON.stringify(echoPayload)) {
      log("PASS", "system.echo → payload echoed correctly");
      passed++;
    } else {
      log("FAIL", `system.echo → ${JSON.stringify(res)}`);
      failed++;
    }
  }

  // Test 4: unknown method returns error
  {
    const errId = "test-err-1";
    const results = await wsSendRecv([
      { id: errId, type: "request", method: "nonexistent.method", params: {} },
    ]);
    const res = results.get(errId) as Record<string, unknown> | undefined;
    if (res && res.error) {
      log("PASS", `nonexistent.method → error: ${(res.error as Record<string, unknown>)?.message}`);
      passed++;
    } else {
      log("FAIL", `nonexistent.method should error → ${JSON.stringify(res)}`);
      failed++;
    }
  }

  // Test 5: concurrent RPC calls
  {
    const results = await wsSendRecv([
      { id: "conc-1", type: "request", method: "system.ping", params: {} },
      { id: "conc-2", type: "request", method: "system.hello", params: { name: "A" } },
      { id: "conc-3", type: "request", method: "system.echo", params: { x: 1 } },
    ]);
    const allOk =
      (results.get("conc-1") as Record<string, unknown>)?.type === "response" &&
      (results.get("conc-2") as Record<string, unknown>)?.type === "response" &&
      (results.get("conc-3") as Record<string, unknown>)?.type === "response";
    if (allOk) {
      log("PASS", "3 concurrent calls → all got responses");
      passed++;
    } else {
      log("FAIL", `concurrent calls → ${JSON.stringify(Object.fromEntries(results))}`);
      failed++;
    }
  }

  // Test 6: health endpoint (HTTP, no auth needed)
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

  // Test 7: auth rejection (wrong token)
  {
    const { WebSocket } = await import("ws");
    const authResult = await new Promise<string>((resolve) => {
      const ws = new WebSocket(`ws://localhost:${PORT}/?token=wrong-token`);
      ws.on("close", (code: number) => resolve(`closed:${code}`));
      ws.on("error", () => resolve("error"));
    });
    if (authResult === "closed:4001") {
      log("PASS", "Wrong token → connection rejected (4001)");
      passed++;
    } else {
      log("FAIL", `Wrong token → ${authResult} (expected closed:4001)`);
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
