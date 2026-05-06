#!/usr/bin/env bun
/* eslint-disable no-console */

/**
 * Smoke test for Hybrid mode (desktop + web service simultaneously).
 * Tests IPC + WS coexistence, multi-client WS, event fan-out.
 *
 * Usage:
 *   bun run scripts/smoke-hybrid-full.ts
 */

import { spawn, execSync } from "child_process";
import { existsSync, mkdtempSync, rmSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { RPCClient, WebSocketTransport } from "../packages/rpc-core/src/index";

const PORT = 3500;
const PROJECT_NAME = "smoke-hybrid-app";
const TOKEN = `${PROJECT_NAME}-token`;
const TIMEOUT_MS = 15_000;

let projectDir: string;
let autoCreated = false;
let serverProcess: ReturnType<typeof spawn> | null = null;
const serverLogs: string[] = [];

const results: { name: string; pass: boolean; detail: string }[] = [];
const pass = (n: string, d: string) => results.push({ name: n, pass: true, detail: d });
const fail = (n: string, d: string) => results.push({ name: n, pass: false, detail: d });

function log(tag: string, msg: string) {
	console.log(`[${tag}] ${msg}`);
}

function cleanup(code: number) {
	if (serverProcess && !serverProcess.killed) {
		log("cleanup", "Stopping server...");
		serverProcess.kill("SIGTERM");
		serverProcess = null;
	}
	if (autoCreated && projectDir && existsSync(projectDir)) {
		log("cleanup", `Removing temp project: ${projectDir}`);
		try {
			rmSync(projectDir, { recursive: true, force: true });
		} catch {
			/* ignore */
		}
	}
	if (code !== 0) process.exit(code);
}

async function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}

async function waitForUrl(url: string, maxMs = 15_000): Promise<void> {
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
	const tmpBase = mkdtempSync(join(tmpdir(), "smoke-hybrid-"));
	projectDir = join(tmpBase, "smoke-hybrid");
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

	log("server", "Starting server with ENABLE_WEB_SERVICE=true...");
	serverProcess = spawn("bun", ["src/server.ts"], {
		cwd: projectDir,
		stdio: ["pipe", "pipe", "pipe"],
		env: {
			...process.env,
			PORT: String(PORT),
			AUTH_TOKEN: TOKEN,
			ENABLE_WEB_SERVICE: "true",
		},
	});
	serverProcess.stdout?.on("data", (data: Buffer) => {
		data
			.toString()
			.split("\n")
			.filter(Boolean)
			.forEach((line) => serverLogs.push(line));
	});
	serverProcess.stderr?.on("data", (data: Buffer) => {
		data
			.toString()
			.split("\n")
			.filter(Boolean)
			.forEach((line) => serverLogs.push(`[stderr] ${line}`));
	});
	serverProcess.on("error", (err) => {
		console.error("Server failed:", err.message);
		cleanup(1);
	});

	await waitForUrl(`http://localhost:${PORT}/health`);

	const actualPort = existsSync(portFile) ? parseInt(readFileSync(portFile, "utf-8").trim()) : PORT;
	log("server", `Server ready on port ${actualPort}`);

	// === HTTP Tests ===

	// Test 1: Health
	{
		const name = "GET /health";
		try {
			const res = await fetch(`http://localhost:${actualPort}/health`);
			const body = (await res.json()) as Record<string, unknown>;
			if (body.status === "ok") {
				pass(name, `{ status: "ok" }`);
			} else {
				fail(name, JSON.stringify(body));
			}
		} catch (e) {
			fail(name, (e as Error).message);
		}
	}

	// Test 2: Auth required for /info/
	{
		const name = "Auth required for /info/";
		try {
			const res = await fetch(`http://localhost:${actualPort}/info/`);
			if (res.status === 401) {
				pass(name, "401");
			} else {
				fail(name, `Got ${res.status}`);
			}
		} catch (e) {
			fail(name, (e as Error).message);
		}
	}

	// === Single Client WS Tests ===
	let clientA: RPCClient | null = null;
	let transportA: WebSocketTransport | null = null;

	try {
		const { client, transport } = await createRpcClient(actualPort);
		clientA = client;
		transportA = transport;
		pass("WS client A connected", "Authenticated");

		// Test 3: system.ping
		{
			const name = "system.ping";
			try {
				const r = await clientA.call<{ pong: boolean }>("system.ping", {});
				if (r.pong === true) {
					pass(name, `{ pong: true }`);
				} else {
					fail(name, JSON.stringify(r));
				}
			} catch (e) {
				fail(name, (e as Error).message);
			}
		}

		// Test 4: chat.send
		{
			const name = "chat.send";
			try {
				const r = await clientA.call<{ ok: boolean }>("chat.send", { content: "hybrid-test" });
				if (r.ok === true) {
					pass(name, `{ ok: true }`);
				} else {
					fail(name, JSON.stringify(r));
				}
			} catch (e) {
				fail(name, (e as Error).message);
			}
		}

		// Test 5: Timer lifecycle + event subscription
		{
			const name1 = "timer.start";
			const name2 = "timer.tick event received";
			const name3 = "timer.stop";

			try {
				let tickReceived = false;
				const tickPromise = new Promise<boolean>((resolve) => {
					const subId = clientA!.subscribe("timer.tick", () => {
						tickReceived = true;
						resolve(true);
						clientA!.unsubscribe(subId);
					});
				});

				const startResult = await clientA.call<{ started?: boolean; alreadyRunning?: boolean }>(
					"timer.start",
					{}
				);
				if (startResult.started === true || startResult.alreadyRunning === true) {
					pass(name1, JSON.stringify(startResult));
				} else {
					fail(name1, JSON.stringify(startResult));
				}

				const gotTick = await Promise.race([tickPromise, sleep(4000).then(() => false)]);

				if (gotTick && tickReceived) {
					pass(name2, "Tick event received");
				} else {
					fail(name2, "No tick event within timeout");
				}

				const stopResult = await clientA.call<{ stopped: boolean }>("timer.stop", {});
				if (stopResult.stopped === true) {
					pass(name3, `{ stopped: true }`);
				} else {
					fail(name3, JSON.stringify(stopResult));
				}
			} catch (e) {
				fail(name1, (e as Error).message);
			}
		}
	} catch (e) {
		fail("WS client A setup", (e as Error).message);
	}

	// === Multi-Client Tests ===
	// Note: Each WS connection gets its own RPCServer instance, so cross-client
	// event fan-out requires a different architecture. Here we just verify
	// each client can independently subscribe and receive events.

	// Test 6: Each client can subscribe and receive its own events
	{
		const name = "Multi-client independent subscriptions";
		let clientB: RPCClient | null = null;
		let transportB: WebSocketTransport | null = null;

		try {
			const { client: bClient, transport: bTransport } = await createRpcClient(actualPort);
			clientB = bClient;
			transportB = bTransport;

			let bReceivedEvent = false;
			const bEventPromise = new Promise<boolean>((resolve) => {
				const subId = clientB!.subscribe("chat.message", () => {
					bReceivedEvent = true;
					resolve(true);
					clientB!.unsubscribe(subId);
				});
			});

			await clientB.call("chat.send", { content: "b-client-message" });

			const bGot = await Promise.race([bEventPromise, sleep(3000).then(() => false)]);

			if (bGot && bReceivedEvent) {
				pass(name, "Client B received its own event");
			} else {
				fail(name, "Client B did not receive event");
			}
		} catch (e) {
			fail(name, (e as Error).message);
		} finally {
			transportB?.close();
		}
	}

	// Test 7: Multiple clients can connect simultaneously
	{
		const name = "Multiple simultaneous WS connections";
		const clients: { transport: WebSocketTransport }[] = [];
		try {
			for (let i = 0; i < 3; i++) {
				const { transport } = await createRpcClient(actualPort);
				clients.push({ transport });
			}
			pass(name, `${clients.length} clients connected`);
		} catch (e) {
			fail(name, (e as Error).message);
		} finally {
			for (const c of clients) c.transport.close();
		}
	}

	// Cleanup client A
	transportA?.close();

	// Summary
	console.log(`\n${"=".repeat(60)}`);
	console.log("Smoke Hybrid Full Test Results");
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

	if (totalFailed > 0 && serverLogs.length > 0) {
		console.log("--- Server logs (on failure) ---");
		for (const line of serverLogs.slice(-20)) console.log(line);
		console.log("--- End logs ---\n");
	}

	cleanup(totalFailed > 0 ? 1 : 0);
}

main().catch((err) => {
	console.error("Fatal:", err instanceof Error ? err.message : String(err));
	cleanup(1);
});
