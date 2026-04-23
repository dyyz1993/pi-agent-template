import type { RPCServer } from "@chat-agent/rpc-core";
import type { MethodParams, MethodResult } from "@chat-agent/rpc-core";
import type { RPCMethods } from "../rpc-schema";

type RegisterFn = <K extends keyof RPCMethods & string>(
  method: K,
  handler: (params: MethodParams<RPCMethods, K>) => Promise<MethodResult<RPCMethods, K>>,
) => void;

export function registerTimerHandlers(server: RPCServer): void {
  const register: RegisterFn = (method, handler) => {
    server.register(method, handler as (params: unknown) => Promise<unknown>);
  };

  let timerId: ReturnType<typeof setInterval> | null = null;

  register("timer.start", async () => {
    if (timerId !== null) return { alreadyRunning: true };
    let count = 0;
    timerId = setInterval(() => {
      count++;
      server.emitEvent("timer.tick", { count, timestamp: Date.now() });
    }, 1000);
    return { started: true };
  });

  register("timer.stop", async () => {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
    return { stopped: true };
  });
}
