#!/usr/bin/env bun
/* eslint-disable no-console */

import { spawn, execSync } from "child_process";
import { existsSync, mkdtempSync, rmSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";

const MAX_WAIT_MS = 30_000;
const POLL_MS = 200;
const AUTH_TOKEN = "pi-agent-template-token";

let backendProc: ReturnType<typeof spawn> | null = null;
let staticServer: Bun.Server<undefined> | null = null;
let projectDir: string;
let autoCreated = false;

function log(tag: string, msg: string) {
	console.log(`[${tag}] ${msg}`);
}

function cleanup(code: number) {
	if (staticServer) staticServer.stop();
	if (backendProc && !backendProc.killed) backendProc.kill("SIGTERM");
	if (autoCreated && projectDir && existsSync(projectDir)) {
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

async function waitForFile(filePath: string, maxMs: number): Promise<string> {
	const start = Date.now();
	while (Date.now() - start < maxMs) {
		if (existsSync(filePath)) {
			try {
				const content = readFileSync(filePath, "utf-8").trim();
				if (content) return content;
			} catch {
				/* ignore parse error */
			}
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
		} catch {
			/* server not ready yet */
		}
		await sleep(POLL_MS);
	}
	throw new Error(`Timed out waiting for ${url}`);
}

function startStaticServer(distDir: string, port: number): Bun.Server<undefined> {
	const resolvedDistDir = resolve(distDir);
	return Bun.serve({
		port,
		fetch(req) {
			const url = new URL(req.url);
			let filePath = join(distDir, url.pathname === "/" ? "index.html" : url.pathname);
			const resolvedPath = resolve(filePath);
			if (!existsSync(resolvedPath) || !resolvedPath.startsWith(resolvedDistDir)) {
				filePath = join(distDir, "index.html");
			}
			return new Response(Bun.file(filePath));
		},
	});
}

async function main() {
	const templateType = process.argv[2] || "general";
	const rootDir = resolve(import.meta.dir, "..");

	const tmpBase = mkdtempSync(join(tmpdir(), "e2e-ui-"));
	projectDir = join(tmpBase, `e2e-ui-${templateType}`);
	autoCreated = true;

	log("setup", `Creating ${templateType} project at: ${projectDir}`);
	execSync(`HUSKY=0 bun run scripts/create.ts e2e-ui-app ${projectDir} --type ${templateType}`, {
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

	log("server", "Starting backend with AUTH_TOKEN...");
	backendProc = spawn("bun", ["src/server.ts"], {
		cwd: projectDir,
		stdio: ["pipe", "pipe", "pipe"],
		env: { ...process.env, AUTH_TOKEN },
	});
	backendProc.on("error", (err) => {
		console.error("Backend failed:", err.message);
		cleanup(1);
	});

	const backendPort = await waitForFile(portFile, 10_000);
	log("server", `Backend ready on port ${backendPort}`);

	log("build", "Building frontend...");
	try {
		execSync("npx vite build", { cwd: projectDir, stdio: "pipe", timeout: 60_000 });
	} catch (err) {
		console.error("Build failed:", (err as Error).message);
		cleanup(1);
		return;
	}
	log("build", "Frontend built successfully");

	const distDir = join(projectDir, "dist");
	if (!existsSync(distDir)) {
		console.error("FAIL: dist directory not found");
		cleanup(1);
		return;
	}

	log("serve", "Starting static server on port 5173...");
	staticServer = startStaticServer(distDir, 5173);

	await waitForUrl("http://localhost:5173", MAX_WAIT_MS);
	log("serve", "Static server ready on http://localhost:5173");

	log("test", "Running Playwright E2E UI tests...");
	const wsUrl = `ws://localhost:${backendPort}/ws`;
	const testPassed = await new Promise<boolean>((resolve) => {
		const pw = spawn("npx", ["playwright", "test", "--reporter=list"], {
			cwd: rootDir,
			stdio: "inherit",
			env: {
				...process.env,
				TEMPLATE_TYPE: templateType,
				E2E_WS_URL: wsUrl,
				E2E_TOKEN: AUTH_TOKEN,
			},
		});
		pw.on("close", (code) => resolve(code === 0));
		pw.on("error", () => resolve(false));
	});
	if (testPassed) {
		log("test", "Playwright tests PASSED");
	} else {
		console.error("Playwright tests FAILED");
		cleanup(1);
		return;
	}

	cleanup(0);
	process.exit(0);
}

main().catch((err) => {
	console.error("Fatal:", err instanceof Error ? err.message : String(err));
	cleanup(1);
});
