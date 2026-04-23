import type { RPCServer } from "@chat-agent/rpc-core";
import type { MethodParams, MethodResult } from "@chat-agent/rpc-core";
import type { RPCMethods, HandlerOptions } from "../rpc-schema";

type RegisterFn = <K extends keyof RPCMethods & string>(
  method: K,
  handler: (params: MethodParams<RPCMethods, K>) => Promise<MethodResult<RPCMethods, K>>,
) => void;

export function register(server: RPCServer, _options: HandlerOptions): void {
  const r: RegisterFn = (method, handler) => {
    server.register(method, handler as (params: unknown) => Promise<unknown>);
  };

  r("chat.list", async (params) => {
    void params.limit;
    return {
      messages: [],
      hasMore: false,
    };
  });

  r("chat.send", async (params) => {
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
