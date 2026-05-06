#!/usr/bin/env bun
/* eslint-disable no-console */

/**
 * Verify npm package works end-to-end after publishing.
 * Simulates what a real user would do:
 *   npx @dyyz1993/create-agent create my-app --type agent
 *
 * Full verification chain:
 *   1. npx create → create project
 *   2. bun install → install dependencies
 *   3. bun run lint → code quality
 *   4. bun run test → unit tests
 *   5. bun run build → frontend build + backend compile
 *   6. Start production server → HTTP + WS
 *   7. WebSocket handshake + RPC call
 */

import { spawn, execSync } from "child_process";
import { existsSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const TEMPLATE = process.argv[2] || "agent";
const PORT = 3700;
const TIMEOUT_MS = 20_000;

let tmpBase: string;
let projectDir: string;
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
	if (tmpBase && existsSync(tmpBase)) {
		log("cleanup", `Removing temp dir: ${tmpBase}`);
		try {
			rmSync(tmpBase, { recursive: true, force: true });
		} catch {
			/* ignore */
		}
	}
	if (code !== 0) process.exit(code);
}

async function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(url: string, maxMs = TIMEOUT_MS): Promise<void> {
	const start = Date.now();
	while (Date.now() - start < maxMs) {
		try {
			const res = await fetch(url);
			if (res.ok || res.status === 401) return;
		} catch {
			/* not ready */
		}
		await sleep(500);
	}
	throw new Error(`Server not ready at ${url} within ${maxMs}ms`);
}

async function runStep(name: string, fn: () => Promise<void> | void) {
	try {
		await fn();
		pass(name, "OK");
		log("PASS", name);
	} catch (e: unknown) {
		const msg = e instanceof Error ? e.message : String(e);
		fail(name, msg);
		log("FAIL", `${name}: ${msg}`);
	}
}

async function main() {
	const version = execSync("npm view @dyyz1993/create-agent version", { encoding: "utf-8" }).trim();
	log("INFO", `Verifying @dyyz1993/create-agent@${version}, template=${TEMPLATE}`);

	const tmpBase = mkdtempSync(join(tmpdir(), `npm-verify-${TEMPLATE}-`));
	projectDir = join(tmpBase, "project");

	process.on("SIGINT", () => cleanup(1));
	process.on("exit", cleanup);

	await runStep("npx create-agent", async () => {
		execSync(
			`npx @dyyz1993/create-agent@latest create verify-app --type ${TEMPLATE} --dir ${projectDir}`,
			{ stdio: "pipe", timeout: 60_000, env: { ...process.env, HUSKY: "0" } }
		);
	});

	await runStep("project structure", () => {
		const required = ["package.json", "src/server.ts", "vite.config.ts"];
		for (const f of required) {
			if (!existsSync(join(projectDir, f))) {
				throw new Error(`Missing: ${f}`);
			}
		}
	});

	await runStep("bun install", async () => {
		execSync("bun install", { cwd: projectDir, stdio: "pipe", timeout: 60_000 });
	});

	await runStep("lint", async () => {
		execSync("bun run lint", { cwd: projectDir, stdio: "pipe", timeout: 60_000 });
	});

	await runStep("test", async () => {
		execSync("bun run test", { cwd: projectDir, stdio: "pipe", timeout: 60_000 });
	});

	await runStep("build", async () => {
		execSync("bun run build", { cwd: projectDir, stdio: "pipe", timeout: 60_000 });
		if (!existsSync(join(projectDir, "dist/index.html"))) {
			throw new Error("dist/index.html not found after build");
		}
	});

	await runStep("production server + HTTP/WS", async () => {
		const authToken = `npm-verify-${TEMPLATE}`;
		serverProcess = spawn("bun", ["run", "src/server.ts"], {
			cwd: projectDir,
			env: { ...process.env, PORT: String(PORT), AUTH_TOKEN: authToken, NODE_ENV: "development" },
			stdio: ["pipe", "pipe", "pipe"],
		});

		serverProcess.stdout?.on("data", (d: Buffer) => serverLogs.push(d.toString()));
		serverProcess.stderr?.on("data", (d: Buffer) => serverLogs.push(d.toString()));

		await waitForServer(`http://localhost:${PORT}/health`);

		const health = await fetch(`http://localhost:${PORT}/health`);
		if (!health.ok) throw new Error(`Health check failed: ${health.status}`);

		const healthData = (await health.json()) as { status: string; uptime: number };
		if (healthData.status !== "ok")
			throw new Error(`Unexpected health status: ${healthData.status}`);

		const wsUrl = `ws://localhost:${PORT}/ws?token=${encodeURIComponent(authToken)}`;
		const ws = new WebSocket(wsUrl);

		const wsOpen = await new Promise<boolean>((resolve) => {
			ws.onopen = () => resolve(true);
			ws.onerror = () => resolve(false);
			setTimeout(() => resolve(false), 5000);
		});
		if (!wsOpen) throw new Error("WebSocket connection failed");

		const rpcResponse = await new Promise<{ error?: { message: string }; result?: unknown }>(
			(resolve, reject) => {
				const timer = setTimeout(() => {
					reject(
						new Error(
							"RPC timeout — readyState=" +
								ws.readyState +
								" logs:\n" +
								serverLogs.slice(-10).join("\n")
						)
					);
				}, 10000);
				ws.onmessage = (ev) => {
					clearTimeout(timer);
					try {
						const data =
							typeof ev.data === "string"
								? ev.data
								: new TextDecoder().decode(ev.data as ArrayBuffer);
						resolve(JSON.parse(data));
					} catch (err) {
						reject(new Error(`Parse error: ${String(err)}`));
					}
				};
				ws.send(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "system.ping", params: {} }));
			}
		);

		if (rpcResponse.error) throw new Error(`RPC error: ${rpcResponse.error.message}`);

		ws.close();
	});

	if (serverProcess && !serverProcess.killed) {
		serverProcess.kill("SIGTERM");
		serverProcess = null;
	}

	console.log("\n" + "=".repeat(60));
	console.log(`npm Package Verification: @dyyz1993/create-agent@${version} (${TEMPLATE})`);
	console.log("=".repeat(60));

	const passed = results.filter((r) => r.pass).length;
	const failed = results.filter((r) => !r.pass).length;
	for (const r of results) {
		console.log(`  ${r.pass ? "✅" : "❌"} ${r.name}${r.detail !== "OK" ? ` — ${r.detail}` : ""}`);
	}
	console.log(`\n${passed}/${passed + failed} passed, ${failed} failed`);
	console.log("=".repeat(60));

	if (failed > 0) {
		console.log("\nServer logs:");
		serverLogs.slice(-20).forEach((l) => console.log("  ", l.trim()));
		process.exit(1);
	}
}

main().catch((e) => {
	console.error("Fatal:", e);
	cleanup(1);
});
