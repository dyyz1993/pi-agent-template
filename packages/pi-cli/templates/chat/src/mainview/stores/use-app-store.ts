import { create } from "zustand";
import { apiClient } from "../lib/api-client";
import type { RPCMethods } from "../lib/api-client";
import type { MethodResult } from "@dyyz1993/rpc-core";
import type { DemoMethod } from "../types";
import { useLogStore } from "./use-log-store";

type DemoResult = MethodResult<RPCMethods, "system.ping">
  | MethodResult<RPCMethods, "system.hello">
  | MethodResult<RPCMethods, "system.echo">
  | MethodResult<RPCMethods, "chat.send">;

interface AppState {
  method: DemoMethod;
  result: DemoResult | null;

  setMethod: (method: DemoMethod) => void;
  callRPC: (inputText: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  method: "system.ping",
  result: null,

  setMethod: (method) => set({ method }),

  callRPC: async (inputText: string) => {
    const { method } = get();
    const addLog = useLogStore.getState().addLog;
    addLog(`RPC call: ${method}`);
    try {
      addLog(`Calling: ${method}...`);
      let res: DemoResult;
      if (method === "system.ping") {
        res = await apiClient.call("system.ping", {});
      } else if (method === "system.hello") {
        res = await apiClient.call("system.hello", {});
      } else if (method === "system.echo") {
        res = await apiClient.call("system.echo", {});
      } else if (method === "chat.send") {
        const content = inputText.trim() || "Hello from RPC";
        res = await apiClient.call("chat.send", { content });
      }
      set({ result: res });
      addLog(`Result: ${JSON.stringify(res)}`);
    } catch (err) {
      addLog(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  },
}));
