import type { RPCServer } from "@chat-agent/rpc-core";
import type { MethodParams, MethodResult } from "@chat-agent/rpc-core";
import type { RPCMethods } from "../rpc-schema";

type RegisterFn = <K extends keyof RPCMethods & string>(
  method: K,
  handler: (params: MethodParams<RPCMethods, K>) => Promise<MethodResult<RPCMethods, K>>,
) => void;

export function registerChatHandlers(server: RPCServer): void {
  const register: RegisterFn = (method, handler) => {
    server.register(method, handler as (params: unknown) => Promise<unknown>);
  };

  register("chat.list", async (params) => {
    // 占位：返回空列表（后续接入文件存储）
    void params.limit;
    return {
      messages: [],
      hasMore: false,
    };
  });

  register("chat.send", async (params) => {
    const reply: {
      id: string;
      role: "assistant";
      content: string;
      timestamp: number;
    } = {
      id: `msg-${Date.now()}`,
      role: "assistant",
      content: `[echo] ${params.content}`,
      timestamp: Date.now(),
    };

    // 通过事件推送
    server.emitEvent("chat.message", {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content: params.content,
      timestamp: Date.now(),
    });
    server.emitEvent("chat.message", reply);

    return reply;
  });
}
