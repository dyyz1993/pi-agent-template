/**
 * HTTP route handlers for the web gateway.
 * Handles: /health, /info/{path}, /file/{path}, /file/upload
 */

import type { IncomingMessage, ServerResponse } from "http";
import { stat, readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { extname, basename, dirname, resolve, join } from "path";
import { tmpdir } from "os";
import { createLogger } from "./lib/logger";
import { verifyToken as verifySseToken } from "../gateway/sse-transport";
import type { SseHandler } from "../gateway/sse-transport";

const log = createLogger("gateway");

const MIME_TYPES: Record<string, string> = {
	".html": "text/html",
	".css": "text/css",
	".js": "application/javascript",
	".json": "application/json",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".gif": "image/gif",
	".svg": "image/svg+xml",
	".ico": "image/x-icon",
	".txt": "text/plain",
	".md": "text/markdown",
	".ts": "text/plain",
	".tsx": "text/plain",
	".py": "text/plain",
	".pdf": "application/pdf",
	".zip": "application/zip",
	".mp4": "video/mp4",
	".mp3": "audio/mpeg",
	".wav": "audio/wav",
};

const ALLOWED_ROOTS = [resolve(process.cwd())];
function isPathAllowed(requestedPath: string): boolean {
	const resolved = resolve(requestedPath);
	return ALLOWED_ROOTS.some((root) => resolved === root || resolved.startsWith(root + "/"));
}

function verifyToken(req: IncomingMessage, authToken: string): boolean {
	return verifySseToken(req, authToken);
}

export interface HttpRouteDeps {
	config: {
		readonly port: number;
		readonly authToken: string;
		readonly maxUploadSize: number;
		readonly corsOrigin: string;
	};
	getSseClientCount: () => number;
	sse: SseHandler;
}

export function createHttpHandler(
	deps: HttpRouteDeps
): (req: IncomingMessage, res: ServerResponse) => void {
	const { config: cfg, getSseClientCount, sse } = deps;

	return async (req, res) => {
		res.setHeader("Access-Control-Allow-Origin", cfg.corsOrigin);
		res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
		res.setHeader("Access-Control-Allow-Headers", "Authorization, Range, Content-Type");
		if (req.method === "OPTIONS") {
			res.writeHead(204).end();
			return;
		}

		if (!req.url) {
			res.writeHead(400).end();
			return;
		}

		const url = new URL(req.url, "http://localhost");

		// ── SSE + RPC routes (require auth) ──
		if (url.pathname === "/api/events" && req.method === "GET") {
			if (!verifyToken(req, cfg.authToken)) {
				res.writeHead(401, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: "Unauthorized" }));
				return;
			}
			sse.handleSseConnect(req, res);
			return;
		}

		if (url.pathname === "/api/rpc" && req.method === "POST") {
			if (!verifyToken(req, cfg.authToken)) {
				res.writeHead(401, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: "Unauthorized" }));
				return;
			}
			await sse.handleRpcPost(req, res);
			return;
		}

		// Browser Agent: resolve asset path from ID (stored as JSON index)
		const assetMatch = url.pathname.match(/^\/api\/assets\/([\w]+)\/download$/);
		if (assetMatch) {
			await handleAssetDownload(assetMatch[1] || '', res);
			return;
		}
		const assetMetaMatch = url.pathname.match(/^\/api\/assets\/([\w]+)$/);
		if (assetMetaMatch) {
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ id: assetMetaMatch[1], note: "Use download endpoint for file" }));
			return;
		}

		if (url.pathname === "/health") {
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ status: "ok", clients: getSseClientCount() }));
			return;
		}

		if (!verifyToken(req, cfg.authToken)) {
			log.warn("Auth failed", { path: url.pathname });
			res.writeHead(401, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: "Unauthorized" }));
			return;
		}

		if (url.pathname.startsWith("/info/")) {
			await handleFileInfo(url.pathname.slice(6), res);
			return;
		}

		if (url.pathname.startsWith("/file/")) {
			if (url.pathname === "/file/upload" && req.method === "POST") {
				await handleFileUpload(req, url.searchParams.get("path"), res, cfg.maxUploadSize);
				return;
			}
			await handleFileContent(url.pathname.slice(6), req, res);
			return;
		}

		res.writeHead(404);
		res.end();
	};
}

async function handleFileInfo(encodedPath: string, res: ServerResponse): Promise<void> {
	const filePath = decodeURIComponent(encodedPath);
	if (!isPathAllowed(filePath)) {
		res.writeHead(403, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ error: "Path not allowed" }));
		return;
	}
	try {
		const s = await stat(filePath);
		res.writeHead(200, { "Content-Type": "application/json" });
		res.end(
			JSON.stringify({
				name: basename(filePath),
				path: filePath,
				size: s.size,
				isDirectory: s.isDirectory(),
				modified: s.mtime.toISOString(),
				mimeType: s.isFile()
					? MIME_TYPES[extname(filePath)] || "application/octet-stream"
					: undefined,
			})
		);
	} catch {
		res.writeHead(404, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ error: "File not found" }));
	}
}

async function handleFileContent(
	encodedPath: string,
	req: IncomingMessage,
	res: ServerResponse
): Promise<void> {
	const filePath = decodeURIComponent(encodedPath);
	if (!isPathAllowed(filePath)) {
		res.writeHead(403, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ error: "Path not allowed" }));
		return;
	}
	try {
		if (!existsSync(filePath)) {
			res.writeHead(404, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: "File not found" }));
			return;
		}
		const s = await stat(filePath);
		const mimeType = MIME_TYPES[extname(filePath)] || "application/octet-stream";

		const range = req.headers["range"];
		if (range) {
			const parts = range.replace(/bytes=/, "").split("-");
			const start = parseInt(parts[0]!, 10);
			const end = parts[1] ? parseInt(parts[1], 10) : s.size - 1;
			const chunkSize = end - start + 1;

			res.writeHead(206, {
				"Content-Range": `bytes ${start}-${end}/${s.size}`,
				"Accept-Ranges": "bytes",
				"Content-Length": chunkSize,
				"Content-Type": mimeType,
			});
			const buffer = await readFile(filePath);
			res.end(buffer.subarray(start, end + 1));
		} else {
			res.writeHead(200, {
				"Content-Length": s.size,
				"Content-Type": mimeType,
				"Accept-Ranges": "bytes",
			});
			const buffer = await readFile(filePath);
			res.end(buffer);
		}
		log.info("File served", { path: filePath });
	} catch {
		res.writeHead(500, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ error: "Failed to read file" }));
	}
}

async function handleFileUpload(
	req: IncomingMessage,
	destPath: string | null,
	res: ServerResponse,
	maxUploadSize: number
): Promise<void> {
	if (!destPath) {
		res.writeHead(400, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ error: "Missing path parameter" }));
		return;
	}
	if (!isPathAllowed(destPath)) {
		res.writeHead(403, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ error: "Path not allowed" }));
		return;
	}
	const contentLength = parseInt(req.headers["content-length"] || "0", 10);
	if (contentLength > maxUploadSize) {
		res.writeHead(413, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ error: `File too large, max ${maxUploadSize / 1024 / 1024}MB` }));
		return;
	}
	try {
		const chunks: Uint8Array[] = [];
		for await (const chunk of req) {
			const bytes =
				typeof chunk === "string"
					? new TextEncoder().encode(chunk)
					: new Uint8Array(chunk as ArrayBuffer);
			chunks.push(bytes);
		}
		const body = Buffer.concat(chunks as any);
		await mkdir(dirname(destPath), { recursive: true });
		await writeFile(destPath, body as any);
		log.info("File uploaded", { path: destPath, size: body.length });
		res.writeHead(200, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ ok: true, path: destPath, size: body.length }));
	} catch (err) {
		res.writeHead(500, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ error: err instanceof Error ? err.message : "Upload failed" }));
	}
}

/**
 * 查找并下载资源文件（搜索 os.tmpdir/browser-agent-assets/）
 */
async function handleAssetDownload(assetId: string, res: ServerResponse): Promise<void> {
	try {
		const assetsDir = join(tmpdir(), "browser-agent-assets");
		if (!existsSync(assetsDir)) {
			res.writeHead(404).end();
			return;
		}
		const { readdir, readFile: readFileP } = await import("fs/promises");
		const sessionDirs = await readdir(assetsDir);
		for (const sessionDir of sessionDirs) {
			const sessionPath = join(assetsDir, sessionDir);
			const entries = await readdir(sessionPath);
			for (const entry of entries) {
				if (entry.includes(assetId)) {
					const filePath = join(sessionPath, entry);
					const s = await stat(filePath);
					const mimeType = MIME_TYPES[extname(filePath)] || "application/octet-stream";
					const buffer = await readFileP(filePath);
					res.writeHead(200, {
						"Content-Type": mimeType,
						"Content-Length": s.size,
						"Content-Disposition": `attachment; filename="${encodeURIComponent(entry)}"`,
					});
					res.end(buffer);
					return;
				}
			}
		}
		res.writeHead(404).end();
	} catch {
		res.writeHead(500).end();
	}
}
