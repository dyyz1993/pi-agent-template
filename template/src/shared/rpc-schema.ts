import type { AnyMethods } from "@chat-agent/rpc-core";
import type { SystemMethods } from "./modules/system";
import type { FileMethods } from "./modules/file";
import type { TimerMethods, TimerEvents } from "./modules/timer";

/**
 * RPC 方法定义 — 前后端共享的唯一类型入口
 *
 * 新增方法：
 * 1. 在 modules/ 下对应模块文件中添加方法定义
 * 2. 在下方 interface 中合并新模块（如果没有的话）
 * 3. 在 bun/index.ts 或 server.ts 中用 register("方法名", handler) 注册实现
 *
 * handler 的 params 和返回值会自动推导，无需额外类型标注
 */
export interface RPCMethods extends AnyMethods, SystemMethods, FileMethods, TimerMethods {}

/**
 * RPC 事件定义 — 合并所有模块事件
 */
export interface RPCEvents extends TimerEvents {}
