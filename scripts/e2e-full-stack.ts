#!/usr/bin/env bun
/* eslint-disable no-console */

/**
 * E2E Full Stack test: builds frontend, starts real backend, verifies
 * HTTP + WS + RPC + CORS in a production-like configuration.
 *
 * Usage:
 *   bun run scripts/e2e-full-stack.ts
 */

import { spawn, execSync } from "child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { RPCClient, WebSocketTransport } from "../packages/rpc-core/src/index";

const PORT = 3400;
const STATIC_PORT = 5181;
const PROJECT_NAME = "e2e-fullstack-app";
const TOKEN = `${PROJECT_NAME}-token`;
const TIMEOUT_MS = 15_000;

let projectDir: string;
let autoCreated = false;
let serverProcess: ReturnType<typeof spawn> | null = null;
let staticProcess: ReturnType<typeof spawn> | null = null;
let staticScriptPath: string | null = null;
const serverLogs: string[] = [];

const results: { name: string; pass: boolean; detail: string }[] = [];
const pass = (n: string, d: string) => results.push({ name: n, pass: true, detail: d });
const fail = (n: string, d: string) => results.push({ name: n, pass: false, detail: d });

function log(tag: string, msg: string) {
	console.log(`[${tag}] ${msg}`);
}

function cleanup(code: number) {
	if (staticProcess && !staticProcess.killed) staticProcess.kill("SIGTERM");
	if (serverProcess && !serverProcess.killed) serverProcess.kill("SIGTERM");
	if (staticScriptPath) {
		try {
			unlinkSync(staticScriptPath);
		} catch {
			/* ignore */
		}
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

function createRpcClient(): Promise<{ client: RPCClient; transport: WebSocketTransport }> {
	const transport = new WebSocketTransport({
		url: `ws://localhost:${PORT}/ws?token=${TOKEN}`,
		reconnect: false,
	});
	return transport.connect().then(() => {
		const client = new RPCClient({ transport, timeout: TIMEOUT_MS });
		return { client, transport };
	});
}

async function main() {
	const template = process.env.TEMPLATE || "agent";
	const rootDir = resolve(import.meta.dir, "..");
	const tmpBase = mkdtempSync(join(tmpdir(), "e2e-fullstack-"));
	projectDir = join(tmpBase, "e2e-fullstack");
	autoCreated = true;

	log("setup", `Creating ${template} project at: ${projectDir}`);
	execSync(`HUSKY=0 bun run scripts/create.ts ${PROJECT_NAME} ${projectDir} --type ${template}`, {
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

	// Build frontend
	log("build", "Building frontend with Vite...");
	try {
		execSync("npx vite build", { cwd: projectDir, stdio: "pipe", timeout: 60_000 });
	} catch (err) {
		console.error("Build failed:", (err as Error).message);
		cleanup(1);
		return;
	}
	const distDir = join(projectDir, "dist");
	if (!existsSync(distDir)) {
		console.error("FAIL: dist directory not found");
		cleanup(1);
		return;
	}
	log("build", "Frontend built successfully");

	// Start backend server
	log("server", `Starting backend on port ${PORT}...`);
	serverProcess = spawn("bun", ["src/server.ts"], {
		cwd: projectDir,
		stdio: ["pipe", "pipe", "pipe"],
		env: { ...process.env, PORT: String(PORT), AUTH_TOKEN: TOKEN, CORS_ORIGIN: "*" },
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
	log("server", "Backend ready");

	// Start static file server for dist/ using bun
	log("static", `Serving dist/ on port ${STATIC_PORT}...`);
	staticScriptPath = join(tmpdir(), `static-server-${Date.now()}.ts`);
	const staticServerCode = `
import { serve } from "bun";
import { readFile } from "fs/promises";
import { join, extname } from "path";
const distDir = ${JSON.stringify(distDir)};
const MIME: Record<string, string> = {
  ".html": "text/html", ".js": "application/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml",
  ".ico": "image/x-icon", ".txt": "text/plain",
};
serve({
  port: ${STATIC_PORT},
  async fetch(req) {
    const url = new URL(req.url);
    let filePath = join(distDir, url.pathname === "/" ? "index.html" : url.pathname);
    try {
      const content = await readFile(filePath);
      const mime = MIME[extname(filePath)] || "application/octet-stream";
      return new Response(content, { headers: { "Content-Type": mime } });
    } catch {
      return new Response("Not Found", { status: 404 });
    }
  },
});
`;
	writeFileSync(staticScriptPath, staticServerCode, "utf-8");
	staticProcess = spawn("bun", [staticScriptPath], {
		cwd: projectDir,
		stdio: ["pipe", "pipe", "pipe"],
	});
	staticProcess.on("error", (err) => {
		console.error("Static server failed:", err.message);
		cleanup(1);
	});
	await waitForUrl(`http://localhost:${STATIC_PORT}`);
	log("static", "Static server ready");

	// === HTTP Tests ===

	// Test 1: Static HTML served
	{
		const name = "GET / → HTML page from dist/";
		try {
			const res = await fetch(`http://localhost:${STATIC_PORT}`);
			const html = await res.text();
			if (html.includes("<html") || html.includes("<!doctype")) {
				pass(name, "HTML page returned");
			} else {
				fail(name, `Not HTML: ${html.substring(0, 100)}`);
			}
		} catch (e) {
			fail(name, (e as Error).message);
		}
	}

	// Test 2: Health endpoint
	{
		const name = "GET /health";
		try {
			const res = await fetch(`http://localhost:${PORT}/health`);
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

	// Test 3: Auth rejection
	{
		const name = "Auth rejection (no token) → 401";
		try {
			const res = await fetch(`http://localhost:${PORT}/info/`);
			if (res.status === 401) {
				pass(name, "401");
			} else {
				fail(name, `Got ${res.status}`);
			}
		} catch (e) {
			fail(name, (e as Error).message);
		}
	}

	// Test 4: CORS headers
	{
		const name = "CORS headers present";
		try {
			const res = await fetch(`http://localhost:${PORT}/health`, {
				method: "OPTIONS",
				headers: { Origin: "http://localhost:9999" },
			});
			const corsHeader = res.headers.get("access-control-allow-origin");
			if (corsHeader) {
				pass(name, `Access-Control-Allow-Origin: ${corsHeader}`);
			} else {
				fail(name, "No CORS header found");
			}
		} catch (e) {
			fail(name, (e as Error).message);
		}
	}

	// === WS + RPC Tests ===
	let rpcClient: RPCClient | null = null;
	let rpcTransport: WebSocketTransport | null = null;

	try {
		const { client, transport } = await createRpcClient();
		rpcClient = client;
		rpcTransport = transport;
		pass("WS connection + auth", "Connected");

		// Test 5: chat.send
		{
			const name = "chat.send";
			try {
				const r = await rpcClient.call<{ ok: boolean }>("chat.send", {
					content: "e2e-fullstack-msg",
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
					pass(name, "Event received");
				} else {
					fail(name, "Timeout");
				}
			} catch (e) {
				fail(name, (e as Error).message);
			}
		}

		// Test 7: file.listDir
		{
			const name = "file.listDir";
			try {
				const r = await rpcClient.call<{ entries: unknown[] }>("file.listDir", { path: "." });
				if (Array.isArray(r.entries)) {
					pass(name, `${r.entries.length} entries`);
				} else {
					fail(name, JSON.stringify(r));
				}
			} catch (e) {
				fail(name, (e as Error).message);
			}
		}

		// Test 8: system.ping
		{
			const name = "system.ping";
			try {
				const r = await rpcClient.call<{ pong: boolean }>("system.ping", {});
				if (r.pong === true) {
					pass(name, `{ pong: true }`);
				} else {
					fail(name, JSON.stringify(r));
				}
			} catch (e) {
				fail(name, (e as Error).message);
			}
		}

		// Test 9: system.echo
		{
			const name = "system.echo";
			try {
				const payload = { e2e: true, nested: { key: "value" } };
				const r = await rpcClient.call<typeof payload>("system.echo", payload);
				if (JSON.stringify(r) === JSON.stringify(payload)) {
					pass(name, "Payload echoed");
				} else {
					fail(name, `Mismatch: ${JSON.stringify(r)}`);
				}
			} catch (e) {
				fail(name, (e as Error).message);
			}
		}

		// Test 10: Unknown method returns error
		{
			const name = "Unknown method → error";
			try {
				await rpcClient.call("nonexistent.method", {});
				fail(name, "Should have thrown");
			} catch (e) {
				pass(name, `Error: ${(e as Error).message}`);
			}
		}

		// Test 11: WS auth rejection
		{
			const name = "WS wrong token → rejected";
			const authResult = await new Promise<string>((resolve) => {
				const ws = new WebSocket(`ws://localhost:${PORT}/ws?token=wrong`);
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
				fail(name, `Got ${authResult}`);
			}
		}
	} catch (e) {
		fail("WS connection", (e as Error).message);
	} finally {
		rpcTransport?.close();
	}

	// Summary
	console.log(`\n${"=".repeat(60)}`);
	console.log("E2E Full Stack Test Results");
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
