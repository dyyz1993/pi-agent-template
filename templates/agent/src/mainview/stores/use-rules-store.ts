import { create } from "zustand";
import { apiClient } from "../lib/api-client";
import { useLogStore } from "./use-log-store";
import type { Rule } from "../../shared/modules/rules";

interface RulesState {
  rules: Rule[];
  fetchRules: () => Promise<void>;
  addRule: (name: string, pattern: string) => Promise<void>;
  toggleRule: (id: string) => Promise<void>;
  removeRule: (id: string) => Promise<void>;
}

export const useRulesStore = create<RulesState>((set) => ({
  rules: [],

  fetchRules: async () => {
    try {
      const result = await apiClient.call("rules.list", {});
      set({ rules: result.rules });
    } catch (err) {
      useLogStore.getState().addLog(`Rules fetch error: ${err instanceof Error ? err.message : String(err)}`);
    }
  },

  addRule: async (name, pattern) => {
    try {
      const result = await apiClient.call("rules.add", { name, pattern });
      set((s) => ({ rules: [...s.rules, result.rule] }));
    } catch (err) {
      useLogStore.getState().addLog(`Rules add error: ${err instanceof Error ? err.message : String(err)}`);
    }
  },

  toggleRule: async (id) => {
    try {
      const result = await apiClient.call("rules.toggle", { id });
      set((s) => ({
        rules: s.rules.map((r) => (r.id === id ? result.rule : r)),
      }));
    } catch (err) {
      useLogStore.getState().addLog(`Rules toggle error: ${err instanceof Error ? err.message : String(err)}`);
    }
  },

  removeRule: async (id) => {
    try {
      await apiClient.call("rules.remove", { id });
      set((s) => ({ rules: s.rules.filter((r) => r.id !== id) }));
    } catch (err) {
      useLogStore.getState().addLog(`Rules remove error: ${err instanceof Error ? err.message : String(err)}`);
    }
  },
}));
