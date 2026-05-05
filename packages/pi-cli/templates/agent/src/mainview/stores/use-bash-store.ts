import { create } from "zustand";
import { apiClient } from "../lib/api-client";
import { useLogStore } from "./use-log-store";

const MAX_OUTPUT_LINES = 5000;
const TRUNCATION_NOTICE = "... [output truncated, showing last 5000 lines]\n";

interface ProcessInfo {
  command: string;
  output: string;
  running: boolean;
  exitCode?: number | null;
}

interface BashState {
  processes: Map<number, ProcessInfo>;
  activePid: number | null;
  addProcess: (pid: number, command: string) => void;
  updateOutput: (pid: number, data: string) => void;
  removeProcess: (pid: number) => void;
  setActive: (pid: number | null) => void;
  executeCommand: (command: string, cwd?: string) => Promise<void>;
  killProcess: (pid: number) => Promise<void>;
  fetchProcesses: () => Promise<void>;
}

export const useBashStore = create<BashState>((set, get) => ({
  processes: new Map(),
  activePid: null,

  addProcess: (pid, command) =>
    set((s) => {
      const next = new Map(s.processes);
      next.set(pid, { command, output: "", running: true });
      return { processes: next, activePid: pid };
    }),

  updateOutput: (pid, data) =>
    set((s) => {
      const next = new Map(s.processes);
      const proc = next.get(pid);
      if (!proc) return { processes: next };
      let newOutput = proc.output + data;
      const lines = newOutput.split("\n");
      if (lines.length > MAX_OUTPUT_LINES) {
        newOutput = TRUNCATION_NOTICE + lines.slice(-MAX_OUTPUT_LINES).join("\n");
      }
      next.set(pid, { ...proc, output: newOutput });
      return { processes: next };
    }),

  removeProcess: (pid) =>
    set((s) => {
      const next = new Map(s.processes);
      const proc = next.get(pid);
      if (proc) next.set(pid, { ...proc, running: false });
      return { processes: next };
    }),

  setActive: (pid) => set({ activePid: pid }),

  executeCommand: async (command, cwd) => {
    try {
      const result = await apiClient.call("bash.execute", { command, cwd });
      get().addProcess(result.pid, command);
      get().updateOutput(result.pid, result.output);
    } catch (err) {
      useLogStore.getState().addLog(`Bash error: ${err instanceof Error ? err.message : String(err)}`);
    }
  },

  killProcess: async (pid) => {
    try {
      await apiClient.call("bash.kill", { pid });
      get().removeProcess(pid);
    } catch (err) {
      useLogStore.getState().addLog(`Kill error: ${err instanceof Error ? err.message : String(err)}`);
    }
  },

  fetchProcesses: async () => {
    try {
      const result = await apiClient.call("bash.listProcesses", {});
      const map = new Map<number, ProcessInfo>();
      for (const p of result.processes) {
        map.set(p.pid, { command: p.command, output: "", running: p.running });
      }
      set({ processes: map });
    } catch (err) {
      useLogStore.getState().addLog(`Fetch processes error: ${err instanceof Error ? err.message : String(err)}`);
    }
  },
}));
