#!/usr/bin/env bun
/* eslint-disable no-console */

/**
 * Smoke test for Web dev mode (bun run dev:web).
 * Creates a project, starts vite + bun server, verifies full chain.
 *
 * Usage:
 *   bun run scripts/smoke-dev-web.ts
 */

import { spawn, execSync } from "child_process";
import { existsSync, mkdtempSync, rmSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { RPCClient, WebSocketTransport } from "../packages/rpc-core/src/index";

const PORT = 3300;
const VITE_PORT = Number(process.env.VITE_PORT || "5173");
const PROJECT_NAME = "smoke-dev-web-app";
const TOKEN = `${PROJECT_NAME}-token`;
const TIMEOUT_MS = 15_000;

let projectDir: string;
let autoCreated = false;
let devProcess: ReturnType<typeof spawn> | null = null;
const processLogs: string[] = [];

const results: { name: string; pass: boolean; detail: string }[] = [];
const pass = (n: string, d: string) => results.push({ name: n, pass: true, detail: d });
const fail = (n: string, d: string) => results.push({ name: n, pass: false, detail: d });

function log(tag: string, msg: string) {
	console.log(`[${tag}] ${msg}`);
}

function cleanup(code: number) {
	if (devProcess && !devProcess.killed) {
		log("cleanup", "Stopping dev process...");
		devProcess.kill("SIGTERM");
		devProcess = null;
	}
	if (autoCreated && projectDir && existsSync(projectDir)) {
		log("cleanup", `Removing temp project: ${projectDir}`);
		try {
			rmSync(projectDir, { recursive: true, force: true });
		} catch {
			/* ignore cleanup error */
		}
	}
	if (code !== 0) process.exit(code);
}

async function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(url: string, maxMs = 15_000): Promise<void> {
	const start = Date.now();
	while (Date.now() - start < maxMs) {
		try {
			const res = await fetch(url);
			if (res.ok || res.status === 200) return;
		} catch {
			// not ready
		}
		await sleep(300);
	}
	throw new Error(`Timed out waiting for ${url}`);
}

async function waitForPortFile(filePath: string, maxMs = 10_000): Promise<number> {
	const start = Date.now();
	while (Date.now() - start < maxMs) {
		if (existsSync(filePath)) {
			try {
				const port = parseInt(readFileSync(filePath, "utf-8").trim());
				if (port > 0) return port;
			} catch {
				/* ignore */
			}
		}
		await sleep(200);
	}
	throw new Error(`Timed out waiting for ${filePath}`);
}

function createRpcClient(
	port: number
): Promise<{ client: RPCClient; transport: WebSocketTransport }> {
	const transport = new WebSocketTransport({
		url: `ws://localhost:${port}/ws?token=${TOKEN}`,
		reconnect: false,
	});
	return transport.connect().then(() => {
		const client = new RPCClient({ transport, timeout: TIMEOUT_MS });
		return { client, transport };
	});
}

async function main() {
	const rootDir = resolve(import.meta.dir, "..");
	const tmpBase = mkdtempSync(join(tmpdir(), "smoke-dev-web-"));
	projectDir = join(tmpBase, "smoke-dev-web");
	autoCreated = true;

	log("setup", `Creating general project at: ${projectDir}`);
	execSync(`HUSKY=0 bun run scripts/create.ts ${PROJECT_NAME} ${projectDir} --type general`, {
		cwd: rootDir,
		stdio: "pipe",
	});
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

	log("dev", "Starting dev:web...");
	devProcess = spawn("bun", ["run", "dev:web"], {
		cwd: projectDir,
		stdio: ["pipe", "pipe", "pipe"],
		env: {
			...process.env,
			PORT: String(PORT),
			AUTH_TOKEN: TOKEN,
		},
	});

	devProcess.stdout?.on("data", (data: Buffer) => {
		data
			.toString()
			.split("\n")
			.filter(Boolean)
			.forEach((line) => {
				processLogs.push(line);
			});
	});
	devProcess.stderr?.on("data", (data: Buffer) => {
		data
			.toString()
			.split("\n")
			.filter(Boolean)
			.forEach((line) => {
				processLogs.push(`[stderr] ${line}`);
			});
	});
	devProcess.on("error", (err) => {
		console.error("Dev process failed:", err.message);
		cleanup(1);
	});

	const backendPort = await waitForPortFile(portFile);
	log("dev", `Backend ready on port ${backendPort}`);

	try {
		await waitForServer(`http://localhost:${VITE_PORT}`, 15_000);
		log("dev", "Vite dev server ready");
	} catch {
		log(
			"dev",
			"Vite dev server not detected (may need VITE_PORT env), continuing with backend tests"
		);
	}

	// Test 1: Vite dev server returns HTML
	{
		const name = "Vite HTML response";
		try {
			const res = await fetch(`http://localhost:${VITE_PORT}`);
			const html = await res.text();
			if (html.includes("<html") || html.includes("<!doctype")) {
				pass(name, "HTML page returned");
			} else {
				fail(name, `Response does not look like HTML: ${html.substring(0, 100)}`);
			}
		} catch (e) {
			fail(name, (e as Error).message);
		}
	}

	// Test 2: Backend /health endpoint
	{
		const name = "GET /health → { status: 'ok' }";
		try {
			const res = await fetch(`http://localhost:${backendPort}/health`);
			const body = (await res.json()) as Record<string, unknown>;
			if (body.status === "ok") {
				pass(name, `{ status: "${body.status}" }`);
			} else {
				fail(name, JSON.stringify(body));
			}
		} catch (e) {
			fail(name, (e as Error).message);
		}
	}

	// Test 3: WS connection with token auth
	let rpcClient: RPCClient | null = null;
	let rpcTransport: WebSocketTransport | null = null;

	try {
		const { client, transport } = await createRpcClient(backendPort);
		rpcClient = client;
		rpcTransport = transport;
		pass("WS connection + auth", "Connected and authenticated");

		// Test 4: system.ping via WS
		{
			const name = "system.ping via WS";
			try {
				const r = await rpcClient.call<{ pong: boolean; timestamp: number }>("system.ping", {});
				if (r.pong === true) {
					pass(name, `{ pong: true }`);
				} else {
					fail(name, JSON.stringify(r));
				}
			} catch (e) {
				fail(name, (e as Error).message);
			}
		}

		// Test 5: chat.send via WS
		{
			const name = "chat.send via WS";
			try {
				const r = await rpcClient.call<{ ok: boolean }>("chat.send", {
					content: "smoke-dev-web-test",
				});
				if (r.ok === true) {
					pass(name, `{ ok: true }`);
				} else {
					fail(name, JSON.stringify(r));
				}
			} catch (e) {
				fail(name, (e as Error).message);
			}
		}

		// Test 6: chat.message subscription
		{
			const name = "chat.message event subscription";
			try {
				const eventPromise = new Promise<boolean>((resolve) => {
					const subId = rpcClient!.subscribe("chat.message", () => {
						resolve(true);
						rpcClient!.unsubscribe(subId);
					});
				});

				await rpcClient.call("chat.send", { content: "trigger-event" });

				const received = await Promise.race([eventPromise, sleep(3000).then(() => false)]);

				if (received) {
					pass(name, "Event received after chat.send");
				} else {
					fail(name, "No event received within timeout");
				}
			} catch (e) {
				fail(name, (e as Error).message);
			}
		}

		// Test 7: system.echo
		{
			const name = "system.echo";
			try {
				const payload = { smoke: "dev-web", ts: Date.now() };
				const r = await rpcClient.call<typeof payload>("system.echo", payload);
				if (JSON.stringify(r) === JSON.stringify(payload)) {
					pass(name, "Payload echoed correctly");
				} else {
					fail(name, `Mismatch: ${JSON.stringify(r)}`);
				}
			} catch (e) {
				fail(name, (e as Error).message);
			}
		}

		// Test 8: WS auth rejection
		{
			const name = "WS wrong token → rejected";
			const authResult = await new Promise<string>((resolve) => {
				const ws = new WebSocket(`ws://localhost:${backendPort}/ws?token=wrong`);
				const timer = setTimeout(() => resolve("timeout"), 5000);
				ws.onclose = (ev: CloseEvent) => {
					clearTimeout(timer);
					resolve(`closed:${ev.code}`);
				};
				ws.onerror = () => {
					clearTimeout(timer);
					resolve("error");
				};
			});
			if (authResult === "closed:4001") {
				pass(name, "closed:4001");
			} else {
				fail(name, `Expected closed:4001, got ${authResult}`);
			}
		}
	} catch (e) {
		fail("WS connection", (e as Error).message);
	} finally {
		rpcTransport?.close();
	}

	// Summary
	console.log(`\n${"=".repeat(60)}`);
	console.log("Smoke Dev-Web Test Results");
	console.log(`${"=".repeat(60)}`);

	let totalPassed = 0;
	let totalFailed = 0;

	for (const r of results) {
		const icon = r.pass ? "✅ PASS" : "❌ FAIL";
		console.log(`  ${icon} ${r.name} — ${r.detail}`);
		if (r.pass) totalPassed++;
		else totalFailed++;
	}

	console.log(`\n${"─".repeat(60)}`);
	console.log(`  Total: ${totalPassed} passed, ${totalFailed} failed`);
	console.log(`${"=".repeat(60)}\n`);

	if (totalFailed > 0 && processLogs.length > 0) {
		console.log("--- Process logs (on failure) ---");
		for (const line of processLogs.slice(-20)) console.log(line);
		console.log("--- End logs ---\n");
	}

	cleanup(totalFailed > 0 ? 1 : 0);
}

main().catch((err) => {
	console.error("Fatal:", err instanceof Error ? err.message : String(err));
	cleanup(1);
});
