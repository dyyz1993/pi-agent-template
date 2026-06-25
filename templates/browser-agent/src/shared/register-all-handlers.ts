import { RPCServer, type Transport } from "@dyyz1993/rpc-core";
import type { HandlerOptions } from "./rpc-schema";
import * as handlers from "./handlers/index";

type RegisterFn = (server: RPCServer, options: HandlerOptions) => void;

/**
 * 自动注册所有 handlers — 从 handlers/index.ts barrel 导入
 *
 * 新增模块：在 handlers/ 创建文件，并在 handlers/index.ts 加一行 export
 */
export function registerAllHandlers(server: RPCServer, options: HandlerOptions): void {
  for (const mod of Object.values(handlers) as RegisterFn[]) {
    mod(server, options);
  }
}

const noopTransport: Transport = {
  send: async () => {},
  onMessage: () => () => {},
  onError: () => () => {},
  onDisconnect: () => () => {},
  isConnected: () => false,
  close: () => {},
};

let _cachedMethods: string[] | null = null;

export function discoverMethodNames(): string[] {
  if (_cachedMethods) return _cachedMethods;
  const server = new RPCServer(noopTransport);
  registerAllHandlers(server, { platform: "web" });
  _cachedMethods = server.getRegisteredMethods();
  server.close();
  return _cachedMethods!;
}
