import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { RPCServer, type Transport } from "@chat-agent/rpc-core";
import { registerAllHandlers } from "./shared/register-all-handlers";
import { stat, readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { extname, basename, dirname, resolve } from "path";

const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50MB

// 路径白名单校验：阻止路径遍历攻击
const ALLOWED_ROOTS = [resolve(process.cwd())];
function isPathAllowed(requestedPath: string): boolean {
  const resolved = resolve(requestedPath);
  return ALLOWED_ROOTS.some((root) => resolved === root || resolved.startsWith(root + "/"));
}

const PORT = 3100;
const AUTH_TOKEN = "pi-agent-template-token";

// Token 验证
function verifyToken(req: { headers: Record<string, string | undefined>; url?: string }): boolean {
  // Header: Authorization: Bearer xxx
  const auth = req.headers["authorization"];
  if (auth === `Bearer ${AUTH_TOKEN}`) return true;

  // Query: ?token=xxx
  if (req.url) {
    try {
      const url = new URL(req.url, "http://localhost");
      if (url.searchParams.get("token") === AUTH_TOKEN) return true;
    } catch {}
  }
  return false;
}

// MIME 类型映射
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

// HTTP Server
const httpServer = createServer(async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
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

  // Health endpoint (不需要鉴权)
  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", clients: wss.clients.size }));
    return;
  }

  // 以下端点需要 Token 鉴权
  if (!verifyToken(req as { headers: Record<string, string | undefined>; url?: string })) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  // 文件元数据: GET /info/{path}
  if (url.pathname.startsWith("/info/")) {
    const filePath = decodeURIComponent(url.pathname.slice(6));
    if (!isPathAllowed(filePath)) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Path not allowed" }));
      return;
    }
    try {
      const s = await stat(filePath);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        name: basename(filePath),
        path: filePath,
        size: s.size,
        isDirectory: s.isDirectory(),
        modified: s.mtime.toISOString(),
        mimeType: s.isFile() ? (MIME_TYPES[extname(filePath)] || "application/octet-stream") : undefined,
      }));
    } catch {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "File not found" }));
    }
    return;
  }

  // 文件内容: GET /file/{path}
  if (url.pathname.startsWith("/file/")) {
    const filePath = decodeURIComponent(url.pathname.slice(6));
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

      // Range 请求支持
      const range = req.headers["range"];
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
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
    } catch {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to read file" }));
    }
    return;
  }

  // 文件上传: POST /file/upload?path={destPath}
  if (url.pathname === "/file/upload" && req.method === "POST") {
    const destPath = url.searchParams.get("path");
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
    // 检查 Content-Length 限制
    const contentLength = parseInt(req.headers["content-length"] || "0", 10);
    if (contentLength > MAX_UPLOAD_SIZE) {
      res.writeHead(413, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: `File too large, max ${MAX_UPLOAD_SIZE / 1024 / 1024}MB` }));
      return;
    }
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
      }
      const body = Buffer.concat(chunks);
      // Ensure parent directory exists
      await mkdir(dirname(destPath), { recursive: true });
      await writeFile(destPath, body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, path: destPath, size: body.length }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : "Upload failed" }));
    }
    return;
  }

  res.writeHead(404);
  res.end();
});

// WebSocket Server
const wss = new WebSocketServer({ server: httpServer, path: "/" });

wss.on("connection", (ws: WebSocket, req) => {
  // Token 验证
  const url = req.url ? new URL(req.url, "http://localhost") : null;
  const token = url?.searchParams.get("token");
  if (token !== AUTH_TOKEN) {
    // eslint-disable-next-line no-console
    console.log("[WS] Connection rejected: invalid token");
    ws.close(4001, "Unauthorized");
    return;
  }

  // eslint-disable-next-line no-console
  console.log("[WS] Client connected, total:", wss.clients.size);

  const wsTransport = {
    send: async (message: unknown): Promise<void> => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    },
    onMessage: (handler: (message: unknown) => void): (() => void) => {
      const listener = (data: Buffer) => {
        try {
          const msg = JSON.parse(data.toString());
          handler(msg);
        } catch (err) {
          console.error("[WS] Failed to parse message:", err instanceof Error ? err.message : String(err));
        }
      };
      ws.on("message", listener);
      return () => ws.off("message", listener);
    },
    onError: (): (() => void) => {
      return () => {};
    },
    onDisconnect: (): (() => void) => {
      return () => {};
    },
    isConnected: (): boolean => ws.readyState === WebSocket.OPEN,
    close: (): void => {},
  };

  const rpcServer = new RPCServer(wsTransport as Transport);

  // 自动导入并注册所有 handlers
  registerAllHandlers(rpcServer, { platform: "web" });

  ws.on("close", () => {
    // eslint-disable-next-line no-console
    console.log("[WS] Client disconnected, total:", wss.clients.size);
    rpcServer.close();
  });

  ws.on("error", (err: Error) => {
    console.error("[WS] Client error:", err.message);
  });
});

httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[Server] HTTP + WebSocket server running on http://localhost:${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`[Server] WebSocket: ws://localhost:${PORT}?token=${AUTH_TOKEN}`);
  // eslint-disable-next-line no-console
  console.log("[Server] Available RPC methods: system.ping, system.hello, system.echo, file.listDir, timer.start, timer.stop");
  // eslint-disable-next-line no-console
  console.log("[Server] File endpoints: GET /file/{path}, GET /info/{path}");
});
