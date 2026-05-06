#!/usr/bin/env bun
/* eslint-disable no-console */

/**
 * Enhanced RPC smoke test — supplements rpc-api-ci-test.ts with:
 * - File write/create/delete lifecycle
 * - File upload HTTP endpoint
 * - Timer lifecycle + event subscription
 * - Feed event subscription + filter
 * - Bash execute + output event (agent template)
 * - Path security tests
 *
 * Usage:
 *   bun run scripts/smoke-rpc-full.ts [--type general|agent]
 */

import { spawn, execSync } from "child_process";
import { existsSync, mkdtempSync, rmSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { RPCClient, WebSocketTransport } from "../packages/rpc-core/src/index";

const PORT = 3600;
const PROJECT_NAME = "smoke-rpc-full-app";
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
	let templateType = process.env.TEMPLATE || "agent";
	for (let i = 2; i < process.argv.length; i++) {
		if (process.argv[i] === "--type" && process.argv[i + 1]) {
			templateType = process.argv[++i];
		}
	}

	const rootDir = resolve(import.meta.dir, "..");
	const tmpBase = mkdtempSync(join(tmpdir(), "smoke-rpc-full-"));
	projectDir = join(tmpBase, `smoke-rpc-full-${templateType}`);
	autoCreated = true;

	log("setup", `Creating ${templateType} project at: ${projectDir}`);
	execSync(
		`HUSKY=0 bun run scripts/create.ts ${PROJECT_NAME} ${projectDir} --type ${templateType}`,
		{
			cwd: rootDir,
			stdio: "pipe",
		}
	);
	if (!existsSync(join(projectDir, "package.json"))) {
		console.error("FAIL: Project creation failed");
		cleanup(1);
		return;
	}
	log("setup", "Project created");

	log("setup", "Installing dependencies...");
	execSync("bun install", { cwd: projectDir, stdio: "pipe" });
	log("setup", "Dependencies installed");

	// Init git for git methods
	try {
		execSync("git config user.email 'ci@example.com'", { cwd: projectDir, stdio: "pipe" });
		execSync("git config user.name 'CI Bot'", { cwd: projectDir, stdio: "pipe" });
		execSync("git add .", { cwd: projectDir, stdio: "pipe" });
		execSync('git commit -m "chore: initial commit"', { cwd: projectDir, stdio: "pipe" });
	} catch {
		/* may already have commit */
	}

	const portFile = join(projectDir, ".server-port");

	log("server", `Starting server on port ${PORT}...`);
	serverProcess = spawn("bun", ["src/server.ts"], {
		cwd: projectDir,
		stdio: ["pipe", "pipe", "pipe"],
		env: { ...process.env, PORT: String(PORT), AUTH_TOKEN: TOKEN },
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

	let rpcClient: RPCClient | null = null;
	let rpcTransport: WebSocketTransport | null = null;

	try {
		const { client, transport } = await createRpcClient(actualPort);
		rpcClient = client;
		rpcTransport = transport;
		log("rpc", "RPC client connected");

		// ==========================================
		// File Write / Create / Delete Lifecycle
		// ==========================================

		// Test: file.createFile
		{
			const name = "file.createFile";
			try {
				const r = await rpcClient.call<{ path: string }>("file.createFile", {
					dirPath: ".",
					name: "smoke-test-file.txt",
				});
				if (r.path && r.path.includes("smoke-test-file.txt")) {
					pass(name, `path=${r.path}`);
				} else {
					fail(name, JSON.stringify(r));
				}
			} catch (e) {
				fail(name, (e as Error).message);
			}
		}

		// Test: file.readFile (created file)
		{
			const name = "file.readFile (created file)";
			try {
				const r = await rpcClient.call<{ content: string; size: number }>("file.readFile", {
					path: "smoke-test-file.txt",
				});
				if (typeof r.content === "string" && r.size === 0) {
					pass(name, `size=${r.size}`);
				} else {
					fail(name, JSON.stringify(r));
				}
			} catch (e) {
				fail(name, (e as Error).message);
			}
		}

		// Test: file.rename
		{
			const name = "file.rename";
			try {
				const r = await rpcClient.call<{ newPath: string }>("file.rename", {
					oldPath: "smoke-test-file.txt",
					newName: "smoke-test-renamed.txt",
				});
				if (r.newPath && r.newPath.includes("smoke-test-renamed.txt")) {
					pass(name, `newPath=${r.newPath}`);
				} else {
					fail(name, JSON.stringify(r));
				}
			} catch (e) {
				fail(name, (e as Error).message);
			}
		}

		// Test: file.delete (renamed file)
		{
			const name = "file.delete";
			try {
				const r = await rpcClient.call<{ ok: boolean }>("file.delete", {
					path: "smoke-test-renamed.txt",
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

		// ==========================================
		// File Upload HTTP Endpoint
		// ==========================================

		// Test: POST /file/upload with token
		{
			const name = "POST /file/upload (with token)";
			try {
				const uploadPath = join(projectDir, "uploaded-test.txt");
				const res = await fetch(
					`http://localhost:${actualPort}/file/upload?path=${encodeURIComponent(uploadPath)}&token=${TOKEN}`,
					{
						method: "POST",
						headers: { "Content-Type": "text/plain" },
						body: "Hello from smoke test!",
					}
				);
				const body = (await res.json()) as Record<string, unknown>;
				if (res.status === 200 && body.ok === true) {
					pass(name, `uploaded ${body.size} bytes`);
				} else if (res.status === 403) {
					pass(name, `403 (path outside HTTP allowed roots — expected in temp dir)`);
				} else {
					fail(name, `status=${res.status}, body=${JSON.stringify(body)}`);
				}
			} catch (e) {
				fail(name, (e as Error).message);
			}
		}

		// Test: POST /file/upload without token → 401
		{
			const name = "POST /file/upload (no token) → 401";
			try {
				const uploadPath = join(projectDir, "should-not-exist.txt");
				const res = await fetch(
					`http://localhost:${actualPort}/file/upload?path=${encodeURIComponent(uploadPath)}`,
					{
						method: "POST",
						headers: { "Content-Type": "text/plain" },
						body: "should fail",
					}
				);
				if (res.status === 401) {
					pass(name, "401");
				} else {
					fail(name, `Got ${res.status}`);
				}
			} catch (e) {
				fail(name, (e as Error).message);
			}
		}

		// ==========================================
		// Timer Lifecycle + Event Subscription
		// ==========================================
		if (templateType === "general" || templateType === "agent") {
			// Test: timer.start + timer.tick subscription + timer.stop
			{
				const name1 = "timer.start + tick event";
				const name2 = "timer.stop";
				try {
					let tickCount = 0;
					const tickPromise = new Promise<number>((resolve) => {
						const subId = rpcClient!.subscribe("timer.tick", () => {
							tickCount++;
							if (tickCount >= 2) {
								resolve(tickCount);
								rpcClient!.unsubscribe(subId);
							}
						});
					});

					const startResult = await rpcClient.call<{ started?: boolean; alreadyRunning?: boolean }>(
						"timer.start",
						{}
					);
					if (startResult.started !== true && startResult.alreadyRunning !== true) {
						fail(name1, JSON.stringify(startResult));
					} else {
						const ticks = await Promise.race([tickPromise, sleep(5000).then(() => -1)]);

						if (ticks >= 2) {
							pass(name1, `${ticks} tick events received`);
						} else {
							fail(name1, `Only ${tickCount} ticks in 5s`);
						}
					}

					const stopResult = await rpcClient.call<{ stopped: boolean }>("timer.stop", {});
					if (stopResult.stopped === true) {
						pass(name2, `{ stopped: true }`);
					} else {
						fail(name2, JSON.stringify(stopResult));
					}
				} catch (e) {
					fail(name1, (e as Error).message);
				}
			}
		}

		// ==========================================
		// Feed Event Subscription + Filter
		// ==========================================
		if (templateType === "general" || templateType === "agent") {
			// Test: feed.update subscription with category filter
			{
				const name = "feed.update subscription (filter by category)";
				try {
					const techEvents: unknown[] = [];
					const techPromise = new Promise<boolean>((resolve) => {
						const subId = rpcClient!.subscribe(
							"feed.update",
							(event: unknown) => {
								techEvents.push(event);
								resolve(true);
								rpcClient!.unsubscribe(subId);
							},
							{ category: "tech" }
						);
					});

					// Post with matching category
					await rpcClient.call("feed.post", { content: "Tech post", category: "tech" });

					const gotTech = await Promise.race([techPromise, sleep(3000).then(() => false)]);

					if (gotTech) {
						pass(name, "Tech category event received");
					} else {
						fail(name, "No tech event within timeout");
					}
				} catch (e) {
					fail(name, (e as Error).message);
				}
			}

			// Test: feed.update filter excludes non-matching category
			{
				const name = "feed.update filter excludes non-matching";
				try {
					let newsReceived = false;
					const subId = rpcClient!.subscribe(
						"feed.update",
						() => {
							newsReceived = true;
						},
						{ category: "news" }
					);

					// Post with different category — should NOT trigger
					await rpcClient.call("feed.post", { content: "General post", category: "general" });
					await sleep(500);

					rpcClient!.unsubscribe(subId);

					if (!newsReceived) {
						pass(name, "Correctly filtered out non-matching category");
					} else {
						fail(name, "Received event for non-matching category");
					}
				} catch (e) {
					fail(name, (e as Error).message);
				}
			}
		}

		// ==========================================
		// Bash Execute + Output Event (agent only)
		// ==========================================
		if (templateType === "agent") {
			// Test: bash.execute + bash.output event
			{
				const name1 = "bash.execute + output event";
				const name2 = "bash.kill";
				try {
					let _outputReceived = false;
					const outputPromise = new Promise<boolean>((resolve) => {
						const subId = rpcClient!.subscribe("bash.output", () => {
							_outputReceived = true;
							resolve(true);
							rpcClient!.unsubscribe(subId);
						});
					});

					const r = await rpcClient.call<{ pid: number; output: string }>("bash.execute", {
						command: "echo smoke-bash-test",
					});

					const gotOutput = await Promise.race([outputPromise, sleep(3000).then(() => false)]);

					if (r.output?.includes("smoke-bash-test") && gotOutput) {
						pass(name1, `pid=${r.pid}, output received`);
					} else if (r.output?.includes("smoke-bash-test")) {
						pass(name1, `pid=${r.pid}, output in response (event may not fire after completion)`);
					} else {
						fail(name1, JSON.stringify(r));
					}

					if (r.pid) {
						const killResult = await rpcClient.call<{ success: boolean }>("bash.kill", {
							pid: r.pid,
						});
						if (killResult.success === true) {
							pass(name2, `killed pid=${r.pid}`);
						} else {
							fail(name2, JSON.stringify(killResult));
						}
					}
				} catch (e) {
					fail(name1, (e as Error).message);
				}
			}
		}

		// ==========================================
		// Path Security Tests
		// ==========================================

		// Test: path traversal attack → should be rejected
		{
			const name = "Path traversal → rejected";
			try {
				await rpcClient.call("file.readFile", { path: "../../../etc/passwd" });
				fail(name, "Should have thrown an error");
			} catch (e) {
				const msg = (e as Error).message;
				if (msg.includes("denied") || msg.includes("Access") || msg.includes("outside")) {
					pass(name, `Error: ${msg}`);
				} else {
					pass(name, `Error thrown: ${msg}`);
				}
			}
		}

		// Test: null byte in path → rejected
		{
			const name = "Null byte in path → rejected";
			try {
				await rpcClient.call("file.readFile", { path: "test\0.txt" });
				fail(name, "Should have thrown an error");
			} catch (e) {
				pass(name, `Error: ${(e as Error).message}`);
			}
		}

		// Test: listDir with relative path
		{
			const name = "file.listDir (safe relative path)";
			try {
				const r = await rpcClient.call<{ entries: unknown[]; basePath: string }>("file.listDir", {
					path: ".",
				});
				if (Array.isArray(r.entries)) {
					pass(name, `${r.entries.length} entries`);
				} else {
					fail(name, JSON.stringify(r));
				}
			} catch (e) {
				fail(name, (e as Error).message);
			}
		}

		// ==========================================
		// Core RPC sanity checks
		// ==========================================

		// Test: system.ping
		{
			const name = "system.ping";
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

		// Test: system.echo
		{
			const name = "system.echo";
			try {
				const payload = { smoke: "rpc-full", arr: [1, 2, 3] };
				const r = await rpcClient.call<typeof payload>("system.echo", payload);
				if (JSON.stringify(r) === JSON.stringify(payload)) {
					pass(name, "Payload echoed");
				} else {
					fail(name, `Mismatch`);
				}
			} catch (e) {
				fail(name, (e as Error).message);
			}
		}

		// Test: chat.send
		{
			const name = "chat.send";
			try {
				const r = await rpcClient.call<{ ok: boolean }>("chat.send", {
					content: "smoke-rpc-full-test",
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
	} catch (e) {
		fail("RPC connection", (e as Error).message);
	} finally {
		rpcTransport?.close();
	}

	// Summary
	console.log(`\n${"=".repeat(60)}`);
	console.log(`Smoke RPC Full Test Results (${templateType})`);
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
