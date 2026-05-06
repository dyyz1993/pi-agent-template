#!/usr/bin/env bun
/* eslint-disable no-console */

import { spawn, execSync } from "child_process";
import { existsSync, mkdtempSync, rmSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join, resolve, extname } from "path";
import http from "node:http";
import net from "node:net";

const MAX_WAIT_MS = 30_000;
const POLL_MS = 200;
const AUTH_TOKEN = "pi-agent-template-token";

let backendProc: ReturnType<typeof spawn> | null = null;
let proxyServer: http.Server | null = null;
let projectDir: string;
let autoCreated = false;

function log(tag: string, msg: string) {
	console.log(`[${tag}] ${msg}`);
}

function cleanup(code: number) {
	if (proxyServer) proxyServer.close();
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

const MIME_TYPES: Record<string, string> = {
	".html": "text/html",
	".js": "application/javascript",
	".mjs": "application/javascript",
	".css": "text/css",
	".json": "application/json",
	".png": "image/png",
	".jpg": "image/jpeg",
	".svg": "image/svg+xml",
	".ico": "image/x-icon",
	".woff": "font/woff",
	".woff2": "font/woff2",
	".map": "application/json",
	".txt": "text/plain",
};

const API_PREFIXES = ["/health", "/info", "/file", "/upload", "/api"];

function startProxyServer(distDir: string, backendPort: number, frontendPort: number): http.Server {
	const server = http.createServer((req, res) => {
		const urlPath = (req.url || "/").split("?")[0];

		if (API_PREFIXES.some((p) => urlPath.startsWith(p))) {
			const proxyReq = http.request(
				{
					hostname: "127.0.0.1",
					port: backendPort,
					method: req.method || "GET",
					path: req.url,
					headers: { ...req.headers, host: `localhost:${backendPort}` },
				},
				(proxyRes) => {
					res.writeHead(proxyRes.statusCode || 200, proxyRes.headers as Record<string, string>);
					proxyRes.pipe(res);
				}
			);
			proxyReq.on("error", () => {
				res.writeHead(502);
				res.end("Bad Gateway");
			});
			req.pipe(proxyReq);
			return;
		}

		let filePath = join(distDir, urlPath === "/" ? "index.html" : urlPath);
		if (!existsSync(filePath) || !filePath.startsWith(distDir)) {
			filePath = join(distDir, "index.html");
		}
		try {
			const data = readFileSync(filePath);
			const contentType = MIME_TYPES[extname(filePath)] || "application/octet-stream";
			res.writeHead(200, { "Content-Type": contentType });
			res.end(data);
		} catch {
			res.writeHead(404);
			res.end("Not found");
		}
	});

	server.on("upgrade", (req, clientSocket, head) => {
		const backend = net.createConnection(backendPort, "127.0.0.1", () => {
			let rawRequest = `${req.method || "GET"} ${req.url} HTTP/1.1\r\n`;
			for (const [key, value] of Object.entries(req.headers)) {
				if (value != null) {
					rawRequest += `${key}: ${Array.isArray(value) ? value.join(", ") : value}\r\n`;
				}
			}
			rawRequest += `Host: localhost:${backendPort}\r\n\r\n`;
			backend.write(rawRequest);
			if (head.length > 0) backend.write(head);
		});

		let buffer = Buffer.alloc(0);
		let headersDone = false;

		function onBackendData(chunk: Buffer) {
			if (headersDone) return;
			buffer = Buffer.concat([buffer, chunk]);
			const idx = buffer.indexOf("\r\n\r\n");
			if (idx !== -1) {
				headersDone = true;
				backend.removeListener("data", onBackendData);
				clientSocket.write(buffer);
				backend.pipe(clientSocket);
				clientSocket.pipe(backend);
			}
		}

		backend.on("data", onBackendData);
		backend.on("error", () => clientSocket.destroy());
		clientSocket.on("error", () => backend.destroy());
	});

	server.listen(frontendPort);
	return server;
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

	log("serve", "Starting proxy server on port 5173...");
	proxyServer = startProxyServer(distDir, parseInt(backendPort), 5173);

	await waitForUrl("http://localhost:5173", MAX_WAIT_MS);
	log("serve", "Proxy server ready on http://localhost:5173 (static + WS proxy to backend)");

	log("test", "Running Playwright E2E UI tests...");
	try {
		execSync("npx playwright test --reporter=list", {
			cwd: rootDir,
			stdio: "inherit",
			env: { ...process.env, TEMPLATE_TYPE: templateType },
			timeout: 90_000,
		});
		log("test", "Playwright tests PASSED");
	} catch {
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
