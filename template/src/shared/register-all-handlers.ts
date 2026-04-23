import type { RPCServer } from "@chat-agent/rpc-core";
import { registerSystemHandlers } from "./handlers/system";
import { registerFileHandlers } from "./handlers/file";
import { registerTimerHandlers } from "./handlers/timer";

interface HandlerOptions {
  platform: "desktop" | "web";
}

/**
 * 统一注册所有 RPC handlers — 两个入口点（bun/index.ts, server.ts）共享
 *
 * 新增方法只需：
 * 1. 在 modules/ 添加类型定义
 * 2. 在 handlers/ 添加 handler 实现
 * 3. 在此处导入并调用注册函数
 */
export function registerAllHandlers(server: RPCServer, options: HandlerOptions): void {
  registerSystemHandlers(server, options);
  registerFileHandlers(server);
  registerTimerHandlers(server);
}
