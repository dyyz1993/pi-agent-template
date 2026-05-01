import type { AnyMethods } from "@dyyz1993/rpc-core";
import type { SystemMethods } from "./modules/system";
import type { ChatMethods, ChatEvents } from "./modules/chat";

export interface RPCMethods extends AnyMethods, SystemMethods, ChatMethods {}

export interface RPCEvents extends ChatEvents {}

export interface HandlerOptions {
  platform: "desktop" | "web";
}
