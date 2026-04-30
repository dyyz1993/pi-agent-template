import { create } from "zustand";
import { apiClient } from "../lib/api-client";
import { useAppStore } from "./use-app-store";
import type { TodoItem, TodoStatus } from "../../../shared/modules/todo";

interface TodoState {
  items: TodoItem[];
  fetchItems: () => Promise<void>;
  addItem: (content: string) => Promise<void>;
  updateItem: (id: string, status: TodoStatus) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
}

export const useTodoStore = create<TodoState>((set) => ({
  items: [],

  fetchItems: async () => {
    try {
      const result = await apiClient.call("todo.list", {});
      set({ items: result.items });
    } catch (err) {
      useAppStore.getState().addLog(`Todo fetch error: ${err instanceof Error ? err.message : String(err)}`);
    }
  },

  addItem: async (content) => {
    try {
      const result = await apiClient.call("todo.add", { content });
      set((s) => ({ items: [...s.items, result.item] }));
    } catch (err) {
      useAppStore.getState().addLog(`Todo add error: ${err instanceof Error ? err.message : String(err)}`);
    }
  },

  updateItem: async (id, status) => {
    try {
      const result = await apiClient.call("todo.update", { id, status });
      set((s) => ({
        items: s.items.map((i) => (i.id === id ? result.item : i)),
      }));
    } catch (err) {
      useAppStore.getState().addLog(`Todo update error: ${err instanceof Error ? err.message : String(err)}`);
    }
  },

  removeItem: async (id) => {
    try {
      await apiClient.call("todo.remove", { id });
      set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
    } catch (err) {
      useAppStore.getState().addLog(`Todo remove error: ${err instanceof Error ? err.message : String(err)}`);
    }
  },
}));
