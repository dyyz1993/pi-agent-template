import { BrowserWindow, BrowserView } from "electrobun/bun";
import { TypedRPCServer, ElectrobunTransport, WSServerTransport, CompositeTransport, LocalAuthMiddleware } from '../../packages/rpc-core/src/index';
import type { PiAgentMethods, PiAgentEvents, FileEntry } from '../schema';
import { logger } from '../logger';
import { readdir, stat, readFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';

const WS_PORT = 3000;
const WORKSPACE_ROOT = '/Users/xuyingzhou/Project/study-desktop/my-react-tailwind-vite-app2/templates/pi-agent-template';

function isWithinWorkspace(filePath: string): boolean {
  const resolved = resolve(filePath);
  return resolved.startsWith(WORKSPACE_ROOT);
}

const compositeTransport = new CompositeTransport();

const ipcTransport = new ElectrobunTransport();
const wsTransport = new WSServerTransport({ port: WS_PORT });

compositeTransport.addTransport('ipc', ipcTransport);
compositeTransport.addTransport('ws', wsTransport);

const localAuth = new LocalAuthMiddleware({ userId: 'local-user', role: 'admin' });

const server = new TypedRPCServer<PiAgentMethods, PiAgentEvents>(compositeTransport, {
  middleware: [localAuth],
  methods: {
    hello: async (params, context) => {
      const name = params?.name || 'World';
      logger.info({ method: 'hello', userId: context?.userId, source: context?.source }, 'RPC call');
      return { message: `Hello ${name}!`, timestamp: Date.now() };
    },
    echo: async (params) => params,
    ping: async (context) => ({ pong: true, timestamp: Date.now(), platform: context?.source || 'unknown' }),
    listDir: async (params, context) => {
      let dirPath: string;
      if (params.path === '.' || !params.path) {
        dirPath = WORKSPACE_ROOT;
      } else {
        dirPath = resolve(params.path);
        if (!isWithinWorkspace(dirPath)) {
          dirPath = WORKSPACE_ROOT;
        }
      }
      logger.info({ method: 'listDir', path: dirPath, userId: context?.userId }, 'File operation');
      const entries = await readdir(dirPath, { withFileTypes: true });
      const result: FileEntry[] = [];
      for (const entry of entries) {
        if (entry.name.startsWith('.') && entry.name !== '.trae') continue;
        const fullPath = join(dirPath, entry.name);
        try {
          const s = await stat(fullPath);
          result.push({
            name: entry.name,
            path: fullPath.replace(WORKSPACE_ROOT + sep, ''),
            type: entry.isDirectory() ? 'directory' : 'file',
            size: s.size,
            modified: s.mtimeMs,
          });
        } catch {
          result.push({
            name: entry.name,
            path: fullPath.replace(WORKSPACE_ROOT + sep, ''),
            type: entry.isDirectory() ? 'directory' : 'file',
          });
        }
      }
      result.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      return { entries: result, basePath: dirPath };
    },
    readFile: async (params, context) => {
      const rawPath = params.path;
      let filePath: string;
      if (rawPath.startsWith('/')) {
        filePath = resolve(rawPath);
        if (!isWithinWorkspace(filePath)) {
          filePath = join(WORKSPACE_ROOT, rawPath);
        }
      } else {
        filePath = join(WORKSPACE_ROOT, rawPath);
      }
      logger.info({ method: 'readFile', path: filePath, userId: context?.userId }, 'File operation');
      const s = await stat(filePath);
      const relativePath = filePath.replace(WORKSPACE_ROOT + sep, '');
      const LARGE_FILE_THRESHOLD = 100 * 1024;
      if (s.size > LARGE_FILE_THRESHOLD) {
        return {
          type: 'large' as const,
          path: relativePath,
          size: s.size,
          url: `/files/${encodeURIComponent(relativePath)}`,
        };
      }
      const ext = filePath.split('.').pop()?.toLowerCase() || '';
      const binaryExts = new Set(['png', 'jpg', 'jpeg', 'gif', 'ico', 'woff', 'woff2', 'ttf', 'eot', 'dylib', 'so', 'dll']);
      if (binaryExts.has(ext)) {
        return {
          type: 'binary' as const,
          path: relativePath,
          size: s.size,
          url: `/files/${encodeURIComponent(relativePath)}`,
        };
      }
      const content = await readFile(filePath, 'utf-8');
      return { type: 'text' as const, content, path: relativePath, size: s.size };
    },
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
      'rpc-message': (data: unknown) => {
        ipcTransport.handleMessage(data);
      }
    }
  }
});

ipcTransport.setWebView(rpc);

const mainWindow = new BrowserWindow({
  title: "Pi Agent",
  url: "views://mainview/index.html",
  frame: {
    width: 1200,
    height: 800,
    x: 200,
    y: 200,
  },
  rpc,
});

mainWindow.on("close", () => {
  logger.info({ event: 'window_closed' }, 'Desktop window closed');
});

setInterval(() => {
  server.emitEvent('heartbeat', { serverTime: Date.now() }, { server: 'pi-agent', platform: 'desktop' });
}, 5000);

logger.info({ wsPort: WS_PORT, workspace: WORKSPACE_ROOT }, 'Desktop window created');

export { rpc };
