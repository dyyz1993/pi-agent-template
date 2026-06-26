import type { AnyMethods } from "@dyyz1993/rpc-core";
import type { SystemMethods } from "./modules/system";
import type { FileMethods } from "./modules/file";
import type { TimerMethods, TimerEvents } from "./modules/timer";
import type { ChatMethods, ChatEvents } from "./modules/chat";
import type { TaskMethods } from "./modules/task";
import type { ContextMethods } from "./modules/context";
import type { OutputMethods } from "./modules/output";

/**
 * RPC 方法定义 — 前后端共享的唯一类型入口
 *
 * Cowork 模块组合：system + chat + file + timer + task + context + output
 */
export interface RPCMethods
	extends
		AnyMethods,
		SystemMethods,
		FileMethods,
		TimerMethods,
		ChatMethods,
		TaskMethods,
		ContextMethods,
		OutputMethods {}

/**
 * RPC 事件定义
 */
export interface RPCEvents extends TimerEvents, ChatEvents {}

/**
 * Handler 注册选项
 */
export interface HandlerOptions {
	platform: "desktop" | "web";
}
