import { BrowserWindow, Updater, Utils, ApplicationMenu, BrowserView } from "electrobun/bun";
import { TypedRPCServer, ElectrobunTransport, CompositeTransport, LocalAuthMiddleware } from '@chat-agent/rpc-core';
import type { PiAgentMethods, PiAgentEvents } from '../schema';
import { logger } from '../logger';

const DEV_SERVER_PORT = 5175;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

const ipcTransport = new ElectrobunTransport();
const compositeTransport = new CompositeTransport();
compositeTransport.addTransport('ipc', ipcTransport);

const localAuth = new LocalAuthMiddleware({ userId: 'local-user', role: 'admin' });

const server = new TypedRPCServer<PiAgentMethods, PiAgentEvents>(compositeTransport, {
  middleware: [localAuth],
  methods: {
    hello: async (params, context) => {
      const name = params?.name || 'World';
      logger.info({ method: 'hello', userId: context?.userId }, 'RPC call');
      return { message: `Hello ${name}!`, timestamp: Date.now() };
    },
    ping: async (context) => ({ pong: true, timestamp: Date.now(), platform: context?.source || 'desktop' }),
  },
  events: {
    heartbeat: { payload: { serverTime: 0 }, metadata: { server: '', platform: '' } },
  },
});

const rpc = BrowserView.defineRPC({
  maxRequestTime: 60000,
  handlers: {
    requests: {},
    messages: {
      'rpc-message': (data: string) => {
        try {
          const message = JSON.parse(data);
          ipcTransport.handleMessage(message);
        } catch (error) {
          logger.error({ err: error }, 'Failed to parse RPC message');
        }
      }
    }
  }
});

ipcTransport.setWebView(rpc);

async function getMainViewUrl(): Promise<string> {
  const channel = await Updater.localInfo.channel();
  if (channel === "dev") {
    try {
      await fetch(DEV_SERVER_URL, { method: "HEAD" });
      logger.info({ url: DEV_SERVER_URL }, 'HMR enabled: Using Vite dev server');
      return DEV_SERVER_URL;
    } catch {
      logger.info('Vite dev server not running. Run \'bun run dev:ui\' for HMR support.');
    }
  }
  return "views://mainview/index.html";
}

ApplicationMenu.setApplicationMenu([
  {
    label: "Pi Agent",
    submenu: [
      { role: "about" },
      { type: "separator" },
      { role: "hide" },
      { role: "hideOthers" },
      { role: "showAll" },
      { type: "separator" },
      { role: "quit" },
    ],
  },
  {
    label: "Edit",
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      { role: "pasteAndMatchStyle" },
      { role: "delete" },
      { type: "separator" },
      { role: "selectAll" },
    ],
  },
  {
    label: "View",
    submenu: [{ role: "toggleFullScreen" }],
  },
  {
    label: "Window",
    submenu: [{ role: "minimize" }, { role: "zoom" }],
  },
]);

const url = await getMainViewUrl();

const mainWindow = new BrowserWindow({
  title: "Pi Agent",
  url,
  frame: {
    width: 1200,
    height: 800,
    x: 200,
    y: 200,
  },
  rpc,
});

mainWindow.on("close", () => {
  Utils.quit();
});

logger.info('Pi Agent desktop app started with RPC architecture!');

setInterval(() => {
  server.emitEvent('heartbeat', { serverTime: Date.now() }, { server: 'pi-agent', platform: 'desktop' });
}, 5000);

export { rpc };
