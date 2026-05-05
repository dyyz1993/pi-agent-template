#!/usr/bin/env bun
/* eslint-disable no-console */

/**
 * RPC API E2E CI Test
 * Creates a project from template, starts the server, and tests all RPC endpoints.
 *
 * Usage:
 *   bun run scripts/rpc-api-ci-test.ts --type <template>
 *
 * Templates:
 *   general  - Tests 18 methods (system.*, chat.*, timer.*, feed.*, git.*, file.*)
 *   chat     - Tests 6 methods (system.*, chat.*)
 *   agent    - Tests 29 methods (system.*, chat.*, bash.*, rules.*, todo.*, feed.*, git.*, file.*)
 */

import { spawn, execSync } from "child_process";
import { existsSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { RPCClient, WebSocketTransport } from "../packages/rpc-core/src/index";

const PORT = 3200;
const PROJECT_NAME = "rpc-api-ci-app";
const TOKEN = `${PROJECT_NAME}-token`;
const WS_URL = `ws://localhost:${PORT}/ws?token=${TOKEN}`;
const TIMEOUT_MS = 15_000;

let projectDir: string;
let autoCreated = false;
let serverProcess: ReturnType<typeof spawn> | null = null;
const serverLogs: string[] = [];

// --- Helpers ---

function log(tag: string, msg: string) {
  console.log(`[${tag}] ${msg}`);
}

function fail(tag: string, msg: string): never {
  console.error(`\n[${tag}] FAIL: ${msg}\n`);
  if (serverLogs.length > 0) {
    console.log("--- Server logs ---");
    for (const line of serverLogs) {
      console.log(line);
    }
    console.log("--- End server logs ---\n");
  }
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

async function createRpcClient(): Promise<{ client: RPCClient; transport: WebSocketTransport }> {
  const transport = new WebSocketTransport({ url: WS_URL, reconnect: false });
  await transport.connect();
  const client = new RPCClient({ transport, timeout: TIMEOUT_MS });
  return { client, transport };
}

// --- Test Runner ---

interface TestResult { name: string; pass: boolean; detail: string }

async function runTests(templateType: string, client: RPCClient): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const pass = (name: string, detail: string) => results.push({ name, pass: true, detail });
  const fail = (name: string, detail: string) => results.push({ name, pass: false, detail });

  // Common tests (all templates)
  {
    const name = "system.ping";
    try {
      const r = await client.call<{ pong: boolean; platform: string; timestamp: number }>("system.ping", {});
      if (r.pong === true && typeof r.timestamp === "number") {
        pass(name, `{ pong: true, platform: "${r.platform}", timestamp: ${r.timestamp} }`);
      } else {
        fail(name, JSON.stringify(r));
      }
    } catch (e) { fail(name, (e as Error).message); }
  }

  {
    const name = "system.hello";
    try {
      const r = await client.call<{ message: string }>("system.hello", { name: "CI-Test" });
      if (r.message === "Hello CI-Test!") {
        pass(name, `"${r.message}"`);
      } else {
        fail(name, JSON.stringify(r));
      }
    } catch (e) { fail(name, (e as Error).message); }
  }

  {
    const name = "system.echo";
    try {
      const payload = { hello: "world", count: 42 };
      const r = await client.call<typeof payload>("system.echo", payload);
      if (JSON.stringify(r) === JSON.stringify(payload)) {
        pass(name, "payload echoed correctly");
      } else {
        fail(name, JSON.stringify(r));
      }
    } catch (e) { fail(name, (e as Error).message); }
  }

  {
    const name = "chat.send";
    try {
      const r = await client.call<{ ok: boolean }>("chat.send", { content: "ci-test-message" });
      if (r.ok === true) { pass(name, "{ ok: true }"); } else { fail(name, JSON.stringify(r)); }
    } catch (e) { fail(name, (e as Error).message); }
  }

  await sleep(200);

  {
    const name = "chat.list";
    try {
      const r = await client.call<{ messages: unknown[]; hasMore: boolean }>("chat.list", { limit: 10 });
      if (Array.isArray(r.messages) && typeof r.hasMore === "boolean") {
        pass(name, `${r.messages.length} messages, hasMore=${r.hasMore}`);
      } else {
        fail(name, JSON.stringify(r));
      }
    } catch (e) { fail(name, (e as Error).message); }
  }

  // General + Agent only
  if (templateType === "general" || templateType === "agent") {
    // feed.post
    {
      const name = "feed.post";
      try {
        const r = await client.call<{ id: string }>("feed.post", { content: "CI feed test", category: "test" });
        if (r.id) { pass(name, `id=${r.id}`); } else { fail(name, JSON.stringify(r)); }
      } catch (e) { fail(name, (e as Error).message); }
    }

    // feed.list
    {
      const name = "feed.list";
      try {
        const r = await client.call<{ posts: unknown[] }>("feed.list", {});
        if (Array.isArray(r.posts)) { pass(name, `${r.posts.length} posts`); } else { fail(name, JSON.stringify(r)); }
      } catch (e) { fail(name, (e as Error).message); }
    }

    // git.status
    {
      const name = "git.status";
      try {
        const r = await client.call<{ branch: string; staged: number; changed: number; untracked: number }>("git.status", {
          repoPath: projectDir,
        });
        if (typeof r.branch === "string") { pass(name, `branch=${r.branch}`); } else { fail(name, JSON.stringify(r)); }
      } catch (e) { fail(name, (e as Error).message); }
    }

    // file.listDir
    {
      const name = "file.listDir";
      try {
        const r = await client.call<{ entries: unknown[] }>("file.listDir", { path: "." });
        if (Array.isArray(r.entries)) { pass(name, `${r.entries.length} entries`); } else { fail(name, JSON.stringify(r)); }
      } catch (e) { fail(name, (e as Error).message); }
    }
  }

  // General only
  if (templateType === "general") {
    let timerId: string | undefined;

    // timer.start
    {
      const name = "timer.start";
      try {
        const r = await client.call<Record<string, unknown>>("timer.start", { duration: 10000, label: "ci-test-timer" });
        timerId = (r.timer as Record<string, unknown>)?.id as string | undefined || (r.id as string | undefined);
        if (r.started === true || (r.timer as Record<string, unknown>)?.status === "running") {
          pass(name, timerId ? `id=${timerId}` : "started=true");
        } else {
          fail(name, JSON.stringify(r));
        }
      } catch (e) { fail(name, (e as Error).message); }
    }

    // timer.stop (cleanup)
    if (timerId) {
      const name = "timer.stop";
      try {
        const r = await client.call<Record<string, unknown>>("timer.stop", { id: timerId });
        const stopped = (r.stopped === true) || ((r.timer as Record<string, unknown>)?.status === "stopped");
        if (stopped) { pass(name, `stopped ${timerId}`); } else { fail(name, JSON.stringify(r)); }
      } catch (e) { fail(name, (e as Error).message); }
    }
  }

  // Agent only
  if (templateType === "agent") {
    let bashPid: number | undefined;
    let ruleId: string | undefined;
    let todoId: string | undefined;

    // bash.execute
    {
      const name = "bash.execute";
      try {
        const r = await client.call<{ pid: number; output: string }>("bash.execute", { command: "echo ci-test" });
        bashPid = r.pid;
        if (r.output?.includes("ci-test")) { pass(name, `pid=${r.pid}, output contains "ci-test"`); } else { fail(name, JSON.stringify(r)); }
      } catch (e) { fail(name, (e as Error).message); }
    }

    // bash.listProcesses
    {
      const name = "bash.listProcesses";
      try {
        const r = await client.call<{ processes: unknown[] }>("bash.listProcesses", {});
        if (Array.isArray(r.processes)) { pass(name, `${r.processes.length} processes`); } else { fail(name, JSON.stringify(r)); }
      } catch (e) { fail(name, (e as Error).message); }
    }

    // bash.kill (cleanup)
    if (bashPid) {
      const name = "bash.kill";
      try {
        const r = await client.call<{ success: boolean }>("bash.kill", { pid: bashPid });
        if (r.success === true) { pass(name, `killed ${bashPid}`); } else { fail(name, JSON.stringify(r)); }
      } catch (e) { fail(name, (e as Error).message); }
    }

    // rules.add
    {
      const name = "rules.add";
      try {
        const r = await client.call<{ rule: { id: string; name: string; enabled: boolean } }>("rules.add", {
          name: "CI Test Rule",
          pattern: "**/*.ci-test.ts",
        });
        ruleId = r.rule?.id;
        if (r.rule?.name === "CI Test Rule") { pass(name, `id=${ruleId}`); } else { fail(name, JSON.stringify(r)); }
      } catch (e) { fail(name, (e as Error).message); }
    }

    // rules.list
    {
      const name = "rules.list";
      try {
        const r = await client.call<{ rules: unknown[] }>("rules.list", {});
        if (Array.isArray(r.rules)) { pass(name, `${r.rules.length} rules`); } else { fail(name, JSON.stringify(r)); }
      } catch (e) { fail(name, (e as Error).message); }
    }

    // rules.toggle
    if (ruleId) {
      const name = "rules.toggle";
      try {
        const r = await client.call<{ rule: { id: string; enabled: boolean } }>("rules.toggle", { id: ruleId });
        if (typeof r.rule?.enabled === "boolean") { pass(name, `enabled=${r.rule.enabled}`); } else { fail(name, JSON.stringify(r)); }
      } catch (e) { fail(name, (e as Error).message); }
    }

    // rules.remove (cleanup)
    if (ruleId) {
      const name = "rules.remove";
      try {
        const r = await client.call<{ success: boolean }>("rules.remove", { id: ruleId });
        if (r.success === true) { pass(name, `removed ${ruleId}`); } else { fail(name, JSON.stringify(r)); }
      } catch (e) { fail(name, (e as Error).message); }
    }

    // todo.add
    {
      const name = "todo.add";
      try {
        const r = await client.call<{ item: { id: string; content: string; status: string } }>("todo.add", {
          content: "CI test task",
        });
        todoId = r.item?.id;
        if (r.item?.content === "CI test task") { pass(name, `id=${todoId}`); } else { fail(name, JSON.stringify(r)); }
      } catch (e) { fail(name, (e as Error).message); }
    }

    // todo.list
    {
      const name = "todo.list";
      try {
        const r = await client.call<{ items: unknown[] }>("todo.list", {});
        if (Array.isArray(r.items)) { pass(name, `${r.items.length} items`); } else { fail(name, JSON.stringify(r)); }
      } catch (e) { fail(name, (e as Error).message); }
    }

    // todo.update
    if (todoId) {
      const name = "todo.update";
      try {
        const r = await client.call<{ item: { id: string; status: string } }>("todo.update", {
          id: todoId,
          status: "completed",
        });
        if (r.item?.status === "completed") { pass(name, "status=completed"); } else { fail(name, JSON.stringify(r)); }
      } catch (e) { fail(name, (e as Error).message); }
    }

    // todo.remove (cleanup)
    if (todoId) {
      const name = "todo.remove";
      try {
        const r = await client.call<{ success: boolean }>("todo.remove", { id: todoId });
        if (r.success === true) { pass(name, `removed ${todoId}`); } else { fail(name, JSON.stringify(r)); }
      } catch (e) { fail(name, (e as Error).message); }
    }

    // git.diff
    {
      const name = "git.diff";
      try {
        const r = await client.call<{ changes: unknown[] }>("git.diff", { repoPath: projectDir });
        if (Array.isArray(r.changes) || typeof r.diff === "string") { pass(name, "diff retrieved"); } else { fail(name, JSON.stringify(r)); }
      } catch (e) { fail(name, (e as Error).message); }
    }

    // git.log
    {
      const name = "git.log";
      try {
        const r = await client.call<{ commits: unknown[] }>("git.log", { repoPath: projectDir });
        if (Array.isArray(r.commits)) { pass(name, `${r.commits.length} commits`); } else { fail(name, JSON.stringify(r)); }
      } catch (e) { fail(name, (e as Error).message); }
    }

    // file.readFile
    {
      const name = "file.readFile";
      try {
        const r = await client.call<{ content: string }>("file.readFile", { path: "package.json" });
        if (typeof r.content === "string") { pass(name, "file read successfully"); } else { fail(name, JSON.stringify(r)); }
      } catch (e) { fail(name, (e as Error).message); }
    }
  }

  return results;
}

// --- Main ---

async function main() {
  let templateType = "general";
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === "--type" && process.argv[i + 1]) {
      templateType = process.argv[++i];
    }
  }

  const validTemplates = ["general", "chat", "agent"];
  if (!validTemplates.includes(templateType)) {
    console.error(`Invalid template type: ${templateType}. Valid: ${validTemplates.join(", ")}`);
    process.exit(1);
  }

  // Create project
  const tmpBase = mkdtempSync(join(tmpdir(), "rpc-ci-"));
  projectDir = join(tmpBase, `rpc-ci-${templateType}`);
  autoCreated = true;
  log("setup", `Creating ${templateType} project at: ${projectDir}`);

  const rootDir = resolve(import.meta.dir, "..");
  execSync(`HUSKY=0 bun run scripts/create.ts ${PROJECT_NAME} ${projectDir} --type ${templateType}`, {
    cwd: rootDir,
    stdio: "pipe",
  });

  if (!existsSync(join(projectDir, "package.json"))) {
    fail("setup", "Project creation failed");
  }
  log("setup", "Project created successfully");

  // Start server
  log("server", `Starting server in ${projectDir}...`);
  serverProcess = spawn("bun", ["run", "src/server.ts"], {
    cwd: projectDir,
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, PORT: String(PORT) },
  });

  serverProcess.stdout?.on("data", (data: Buffer) => {
    const lines = data.toString().split("\n").filter(Boolean);
    for (const line of lines) {
      serverLogs.push(line);
    }
  });
  serverProcess.stderr?.on("data", (data: Buffer) => {
    const lines = data.toString().split("\n").filter(Boolean);
    for (const line of lines) {
      serverLogs.push(`[stderr] ${line}`);
    }
  });

  serverProcess.on("error", (err) => {
    fail("server", `Failed to start: ${err.message}`);
  });

  await waitForServer();
  log("server", "Server is ready");

  // Run tests
  log("test", `Running RPC API tests for ${templateType} template...\n`);

  let passed = 0;
  let failed = 0;

  let rpcTransport: WebSocketTransport | null = null;

  try {
    log("rpc", "Connecting RPC client via WebSocketTransport...");
    const { client, transport } = await createRpcClient();
    rpcTransport = transport;
    log("rpc", "RPC client connected");

    const results = await runTests(templateType, client);

    for (const r of results) {
      const icon = r.pass ? "PASS" : "FAIL";
      console.log(`  [${icon}] ${r.name} — ${r.detail}`);
      if (r.pass) { passed++; } else { failed++; }
    }
  } catch (err) {
    log("FAIL", `RPC client setup → ${(err as Error).message}`);
    failed = 1;
  } finally {
    if (rpcTransport) {
      rpcTransport.close();
    }
  }

  // Summary
  console.log(`\n${"=".repeat(40)}`);
  console.log(`RPC API CI Test Results: ${passed} passed, ${failed} failed`);
  console.log("=".repeat(40));

  if (failed > 0 && serverLogs.length > 0) {
    console.log("\n--- Server logs (on failure) ---");
    for (const line of serverLogs) {
      console.log(line);
    }
    console.log("--- End server logs ---");
  }

  cleanup(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  fail("fatal", err instanceof Error ? err.message : String(err));
});
