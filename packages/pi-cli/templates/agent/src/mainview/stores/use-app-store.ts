import { create } from "zustand";
import { apiClient } from "../lib/api-client";
import type { RPCMethods } from "../lib/api-client";
import type { MethodResult } from "@dyyzz1993/rpc-core";
import type { DemoMethod } from "../types";
import { useLogStore } from "./use-log-store";

type DemoResult = MethodResult<RPCMethods, "system.ping">
  | MethodResult<RPCMethods, "system.hello">
  | MethodResult<RPCMethods, "system.echo">
  | MethodResult<RPCMethods, "chat.send">;

interface AppState {
  method: DemoMethod;
  result: DemoResult | null;
  tickEvents: string[];
  tickCount: number;
  subscriptionId: string | null;
  timerRunning: boolean;

  setMethod: (method: DemoMethod) => void;
  callRPC: (inputText: string) => Promise<void>;
  handleSubscribe: () => Promise<void>;
  handleUnsubscribe: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  method: "system.ping",
  result: null,
  tickEvents: [],
  tickCount: 0,
  subscriptionId: null,
  timerRunning: false,

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

  handleSubscribe: async () => {
    const addLog = useLogStore.getState().addLog;
    try {
      addLog("Subscribing to tick events...");
      await apiClient.call("timer.start", {});
      set({ timerRunning: true });
      addLog("Timer started");

      const subId = await apiClient.subscribe("timer.tick", (payload) => {
        const time = new Date(payload.timestamp).toLocaleTimeString();
        set((s) => ({
          tickEvents: [...s.tickEvents.slice(-19), `#${payload.count} @ ${time}`],
          tickCount: s.tickCount + 1,
        }));
      }, {});
      set({ subscriptionId: subId });
      addLog(`Subscribed: ${subId}`);
    } catch (err) {
      addLog(`Subscribe error: ${err instanceof Error ? err.message : String(err)}`);
    }
  },

  handleUnsubscribe: async () => {
    const { subscriptionId } = get();
    const addLog = useLogStore.getState().addLog;
    try {
      if (subscriptionId) {
        apiClient.unsubscribe(subscriptionId);
        set({ subscriptionId: null });
        addLog("Unsubscribed");
      }
      await apiClient.call("timer.stop", {});
      set({ timerRunning: false });
      addLog("Timer stopped");
    } catch (err) {
      addLog(`Unsubscribe error: ${err instanceof Error ? err.message : String(err)}`);
    }
  },
}));
