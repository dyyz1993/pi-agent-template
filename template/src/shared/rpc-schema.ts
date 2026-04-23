import type { AnyMethods } from "@chat-agent/rpc-core";
import type { SystemMethods } from "./modules/system";
import type { FileMethods } from "./modules/file";
import type { TimerMethods, TimerEvents } from "./modules/timer";
import type { ChatMethods, ChatEvents } from "./modules/chat";

/**
 * RPC 方法定义 — 前后端共享的唯一类型入口
 *
 * 新增方法只需三步：
 * 1. 在 modules/ 下对应模块文件中添加方法类型定义
 * 2. 在下方 interface 中合并新模块（如果没有的话）
 * 3. 在 handlers/ 下对应模块文件中添加 handler 实现，并在 register-all-handlers.ts 中注册
 *
 * 入口文件（bun/index.ts, server.ts）无需修改，自动获得新方法。
 */
export interface RPCMethods extends AnyMethods, SystemMethods, FileMethods, TimerMethods, ChatMethods {}

/**
 * RPC 事件定义 — 合并所有模块事件
 */
export interface RPCEvents extends TimerEvents, ChatEvents {}
