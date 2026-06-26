/**
 * Dev orchestration script — single command to start backend + Vite.
 *
 * Usage: bun run dev:web
 *
 * 1. Starts backend server (dynamic port, writes to .server-port)
 * 2. Waits for .server-port to appear
 * 3. Starts Vite dev server (reads backend port for proxy)
 * 4. On Ctrl+C / SIGTERM: kills both processes, cleans up .server-port
 */

import { spawn } from "child_process";
import { existsSync, readFileSync, unlinkSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(import.meta.dir, "..");
const PORT_FILE = resolve(ROOT, ".server-port");
const MAX_WAIT_MS = 10000;
const POLL_INTERVAL_MS = 100;

let backend: ReturnType<typeof spawn> | null = null;
let vite: ReturnType<typeof spawn> | null = null;
let shuttingDown = false;

function cleanup() {
  if (shuttingDown) return;
  shuttingDown = true;

  if (vite && !vite.killed) {
    vite.kill("SIGTERM");
  }
  if (backend && !backend.killed) {
    backend.kill("SIGTERM");
  }
  try { if (existsSync(PORT_FILE)) unlinkSync(PORT_FILE); } catch { /* ignore cleanup errors */ }

  setTimeout(() => {
    if (backend && !backend.killed) backend.kill("SIGKILL");
    if (vite && !vite.killed) vite.kill("SIGKILL");
    process.exit(0);
  }, 3000);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", () => {
  try { if (existsSync(PORT_FILE)) unlinkSync(PORT_FILE); } catch { /* ignore */ }
});

function log(tag: string, msg: string) {
  console.log(`[${tag}] ${msg}`);
}

function waitForPortFile(): Promise<number> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (existsSync(PORT_FILE)) {
        try {
          const port = parseInt(readFileSync(PORT_FILE, "utf-8").trim());
          if (port > 0) { resolve(port); return; }
        } catch { /* ignore parse errors */ }
      }
      if (Date.now() - start > MAX_WAIT_MS) {
        reject(new Error("Timed out waiting for backend to start"));
        return;
      }
      setTimeout(check, POLL_INTERVAL_MS);
    };
    check();
  });
}

async function main() {
  log("dev", "Starting backend server...");

  backend = spawn("bun", ["src/server.ts"], {
    cwd: ROOT,
    stdio: ["pipe", "pipe", "pipe"],
  });

  backend.stdout?.on("data", (data: Buffer) => {
    data.toString().split("\n").filter(Boolean).forEach((line) => {
      log("backend", line);
    });
  });

  backend.stderr?.on("data", (data: Buffer) => {
    data.toString().split("\n").filter(Boolean).forEach((line) => {
      log("backend", line);
    });
  });

  backend.on("exit", (code) => {
    if (!shuttingDown) {
      log("backend", `exited with code ${code}`);
      cleanup();
    }
  });

  const backendPort = await waitForPortFile();
  log("dev", `Backend ready on port ${backendPort}`);

  log("dev", "Starting Vite dev server...");
  vite = spawn("vite", [], {
    cwd: ROOT,
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env },
  });

  vite.stdout?.on("data", (data: Buffer) => {
    data.toString().split("\n").filter(Boolean).forEach((line) => {
      log("vite", line);
    });
  });

  vite.stderr?.on("data", (data: Buffer) => {
    data.toString().split("\n").filter(Boolean).forEach((line) => {
      log("vite", line);
    });
  });

  vite.on("exit", (code) => {
    if (!shuttingDown) {
      log("vite", `exited with code ${code}`);
      cleanup();
    }
  });

  log("dev", `Proxy: Vite → http://localhost:${backendPort}`);
  log("dev", "Press Ctrl+C to stop both servers");
}

main().catch((err) => {
  console.error("Dev startup failed:", err.message);
  cleanup();
  process.exit(1);
});
