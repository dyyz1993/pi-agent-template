import type { RPCServer } from "@chat-agent/rpc-core";
import type { MethodParams, MethodResult } from "@chat-agent/rpc-core";
import type { RPCMethods } from "./rpc-schema";

/**
 * 创建类型安全的 handler 注册器
 *
 * 绑定 RPCMethods schema 后，register() 的方法名、params、返回值全部自动推导
 *
 * 用法：
 *   const register = createTypedRegister(server);
 *
 *   register("ping", async () => ({
 *     pong: true, timestamp: Date.now(), platform: "desktop"   // ← 返回值自动检查
 *   }));
 *
 *   register("hello", async (params) => {
 *     // params.name 自动推导为 string | undefined
 *     return { message: `Hello ${params.name}!`, timestamp: Date.now() };
 *   });
 */
export function createTypedRegister(server: RPCServer) {
  return function register<K extends keyof RPCMethods & string>(
    method: K,
    handler: (params: MethodParams<RPCMethods, K>) => Promise<MethodResult<RPCMethods, K>>
  ): void {
    // eslint-disable-next-line rpc/no-direct-register
    server.register(method, handler as (params: unknown) => Promise<unknown>);
  };
}
