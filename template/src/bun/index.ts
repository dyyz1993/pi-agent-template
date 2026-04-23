import { BrowserWindow, BrowserView, Updater, ApplicationMenu } from "electrobun/bun";
import { RPCServer } from "@chat-agent/rpc-core";
import { ElectrobunTransport } from "../gateway/ipc-transport";
import { registerAllHandlers } from "../shared/register-all-handlers";

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

// --- 注册 RPC handlers（单点定义，自动推导） ---
registerAllHandlers(server, { platform: "desktop" });

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
