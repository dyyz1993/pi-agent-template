import type { RPCServer } from "@chat-agent/rpc-core";
import type { MethodParams, MethodResult } from "@chat-agent/rpc-core";
import type { RPCMethods } from "../rpc-schema";

type RegisterFn = <K extends keyof RPCMethods & string>(
  method: K,
  handler: (params: MethodParams<RPCMethods, K>) => Promise<MethodResult<RPCMethods, K>>,
) => void;

interface SystemOptions {
  platform: "desktop" | "web";
}

export function registerSystemHandlers(server: RPCServer, options: SystemOptions): void {
  const register: RegisterFn = (method, handler) => {
    server.register(method, handler as (params: unknown) => Promise<unknown>);
  };

  register("system.ping", async () => ({
    pong: true,
    timestamp: Date.now(),
    platform: options.platform,
  }));

  register("system.hello", async (params) => ({
    message: `Hello ${params.name || "World"}!`,
    timestamp: Date.now(),
  }));

  register("system.echo", async (params) => params);
}
