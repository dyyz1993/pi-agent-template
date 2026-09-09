import { create } from "zustand";

interface LogState {
  logs: string[];
  addLog: (message: string) => void;
}

const MAX_LOGS = 100;

export const useLogStore = create<LogState>((set) => ({
  logs: [],
  addLog: (message) =>
    set((state) => ({
      logs: [...state.logs.slice(-(MAX_LOGS - 1)), `[${new Date().toISOString().slice(11, 19)}] ${message}`],
    })),
}));
