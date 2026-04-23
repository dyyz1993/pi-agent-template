import { BrowserWindow, BrowserView, Updater, ApplicationMenu } from "electrobun/bun";
import { RPCServer } from "@chat-agent/rpc-core";
import { ElectrobunTransport } from "../gateway/ipc-transport";
import { createTypedRegister } from "../shared/typed-handlers";

async function getMainViewUrl(): Promise<string> {
  const channel = await Updater.localInfo.channel();
  const DEV_SERVER_URL = "http://localhost:5173";
  if (channel === "dev") {
    try {
      await fetch(DEV_SERVER_URL, { method: "HEAD" });
      // eslint-disable-next-line no-console
      console.log(`HMR enabled: Using Vite dev server at ${DEV_SERVER_URL}`);
      return DEV_SERVER_URL;
    } catch {
      // eslint-disable-next-line no-console
      console.log("Vite dev server not running.");
    }
  }
  return "views://mainview/index.html";
}

const url = await getMainViewUrl();

const transport = new ElectrobunTransport();
const server = new RPCServer(transport);
const register = createTypedRegister(server);

// --- 注册 RPC handlers（params 和返回值自动推导） ---

register("system.ping", async () => {
  return { pong: true, timestamp: Date.now(), platform: "desktop" };
});

register("system.hello", async (params) => {
  return { message: `Hello ${params.name || "World"}!`, timestamp: Date.now() };
});

register("system.echo", async (params) => params);

register("file.listDir", async (params) => {
  const { readdir, stat } = await import("fs/promises");
  const { join } = await import("path");
  const basePath = params.path || process.cwd();
  const entries: { name: string; path: string; type: "file" | "directory"; size?: number }[] = [];
  try {
    const files = await readdir(basePath);
    for (const name of files) {
      const fullPath = join(basePath, name);
      try {
        const s = await stat(fullPath);
        entries.push({
          name,
          path: fullPath,
          type: s.isDirectory() ? "directory" : "file",
          size: s.size,
        });
      } catch {
        entries.push({ name, path: fullPath, type: "file" });
      }
    }
  } catch (e) {
    console.error("listDir error:", e);
  }
  return { entries, basePath };
});

// Timer: 每秒 emitEvent("tick")
let timerId: ReturnType<typeof setInterval> | null = null;

register("timer.start", async () => {
  if (timerId !== null) return { alreadyRunning: true };
  let count = 0;
  timerId = setInterval(() => {
    count++;
    server.emitEvent("timer.tick", { count, timestamp: Date.now() });
  }, 1000);
  return { started: true };
});

register("timer.stop", async () => {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
  return { stopped: true };
});

// --- 创建窗口 ---

const mainWindow = new BrowserWindow({
  title: "Pi Agent",
  url,
  frame: {
    width: 1200,
    height: 800,
    x: 200,
    y: 200,
  },
  rpc: BrowserView.defineRPC({
    maxRequestTime: 60000,
    handlers: {
      requests: {},
      messages: {
        "rpc-message": (data: unknown) => {
          try {
            const message = typeof data === "string" ? JSON.parse(data) : data;
            transport.handleMessage(message);
          } catch (error) {
            console.error("[IPC] Failed to parse RPC message:", error);
          }
        },
      },
    },
  }),
});

transport.setBrowserView(mainWindow.webview);

// eslint-disable-next-line no-console
console.log("Pi Agent desktop app started!");

ApplicationMenu.setApplicationMenu([
  { label: "Pi Agent", submenu: [{ role: "about" }, { type: "separator" }, { role: "hide" }, { role: "hideOthers" }, { role: "showAll" }, { type: "separator" }, { role: "quit" }] },
  { label: "Edit", submenu: [{ role: "undo" }, { role: "redo" }, { type: "separator" }, { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" }] },
  { label: "View", submenu: [{ role: "toggleFullScreen" }] },
  { label: "Window", submenu: [{ role: "minimize" }, { role: "zoom" }] },
]);
