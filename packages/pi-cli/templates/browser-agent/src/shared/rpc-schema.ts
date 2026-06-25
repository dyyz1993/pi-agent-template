import type { AnyMethods } from "@dyyz1993/rpc-core";
import type { SystemMethods } from "./modules/system";
import type { FileMethods } from "./modules/file";
import type { TimerMethods, TimerEvents } from "./modules/timer";
import type { ChatMethods, ChatEvents } from "./modules/chat";
import type { BrowserMethods, BrowserEvents } from "./modules/browser";
import type { SessionMethods } from "./modules/session";

/**
 * RPC 方法定义 — 前后端共享的唯一类型入口
 *
 * 对应 PRD §8 数据模型 + §7 API 设计
 */
export interface RPCMethods
	extends
		AnyMethods,
		SystemMethods,
		FileMethods,
		TimerMethods,
		ChatMethods,
		BrowserMethods,
		SessionMethods {}

/**
 * RPC 事件定义
 */
export interface RPCEvents extends TimerEvents, ChatEvents, BrowserEvents {}

/**
 * Handler 注册选项
 */
export interface HandlerOptions {
	platform: "desktop" | "web";
}
