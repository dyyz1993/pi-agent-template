/**
 * Web server entry point — HTTP file endpoints + WebSocket RPC gateway.
 * Port auto-negotiation: tries config.port first, increments on EADDRINUSE.
 * Writes actual port to .server-port for dev orchestration.
 */

import { createServer } from "http";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { join, resolve, basename } from "path";
import { config } from "./server-config";
import { createHttpHandler } from "./gateway/http-routes";
import { createWsHandler } from "./gateway/ws-handler";
import { createLogger, configureLogDir } from "./shared/lib/logger";
import { registerPort, unregisterPort, formatRegistryForOutput } from "./shared/lib/port-registry";
import { discoverMethodNames } from "./shared/register-all-handlers";

configureLogDir(config.logDir);
const log = createLogger("server");

const PORT_FILE = join(import.meta.dir, "..", ".server-port");
const PROJECT_ROOT = resolve(import.meta.dir, "..");
const PROJECT_NAME = basename(PROJECT_ROOT);

function cleanupPortFile() {
  try { if (existsSync(PORT_FILE)) unlinkSync(PORT_FILE); } catch {}
  unregisterPort(PROJECT_ROOT);
}

function writePortFile(port: number) {
  writeFileSync(PORT_FILE, String(port), "utf-8");
}

process.on("exit", cleanupPortFile);
process.on("SIGINT", () => { cleanupPortFile(); process.exit(0); });
process.on("SIGTERM", () => { cleanupPortFile(); process.exit(0); });

const httpServer = createServer();
const wss = createWsHandler(httpServer, { config });

httpServer.on("request", createHttpHandler({
  config,
  getWebSocketClientCount: () => wss.clients.size,
}));

function checkPort(port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const testServer = createServer();
    testServer.once("error", (err: NodeJS.ErrnoException) => {
      testServer.close();
      reject(err);
    });
    testServer.once("listening", () => {
      testServer.close();
      resolve(port);
    });
    testServer.listen(port);
  });
}

async function findAvailablePort(startPort: number, maxRetries: number = 10): Promise<number> {
  for (let port = startPort; port < startPort + maxRetries; port++) {
    try {
      await checkPort(port);
      return port;
    } catch {
      log.info(`Port ${port} in use, trying ${port + 1}...`);
    }
  }
  throw new Error(`No available port found after ${maxRetries} retries`);
}

async function start() {
  const port = await findAvailablePort(config.port);
  httpServer.listen(port, () => {
    writePortFile(port);
    registerPort(PROJECT_ROOT, port, PROJECT_NAME);
    log.info(`HTTP + WebSocket server running on http://localhost:${port}`);
    log.info(`WebSocket: ws://localhost:${port}/ws (auth required)`);
    log.info(`Available RPC methods: ${discoverMethodNames().join(", ")}`);
    log.info("File endpoints: GET /file/{path}, GET /info/{path}");
    // eslint-disable-next-line no-console
    console.log("\n" + formatRegistryForOutput() + "\n");
  });
}

start().catch((err) => {
  log.error("Server failed to start", { error: err.message });
  process.exit(1);
});
