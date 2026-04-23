import { create } from "zustand";
import { apiClient } from "../lib/api-client";
import { useAppStore } from "./use-app-store";

export interface GitFileChange {
  path: string;
  status: "modified" | "added" | "deleted" | "renamed" | "copied";
}

interface GitState {
  branch: string;
  ahead: number;
  behind: number;
  staged: GitFileChange[];
  changed: GitFileChange[];
  untracked: string[];
  currentDiff: { filePath: string; diff: string; oldContent: string; newContent: string } | null;
  loadingDiff: boolean;

  fetchStatus: (repoPath: string) => Promise<void>;
  fetchDiff: (repoPath: string, filePath: string, staged?: boolean) => Promise<void>;
  clearDiff: () => void;
}

export const useGitStore = create<GitState>((set) => ({
  branch: "",
  ahead: 0,
  behind: 0,
  staged: [],
  changed: [],
  untracked: [],
  currentDiff: null,
  loadingDiff: false,

  fetchStatus: async (repoPath) => {
    const addLog = useAppStore.getState().addLog;
    try {
      const res = await apiClient.call("git.status", { repoPath });
      set({
        branch: res.branch,
        ahead: res.ahead,
        behind: res.behind,
        staged: res.staged,
        changed: res.changed,
        untracked: res.untracked,
      });
    } catch (err) {
      addLog(`Git status error: ${err instanceof Error ? err.message : String(err)}`);
    }
  },

  fetchDiff: async (repoPath, filePath, staged) => {
    const addLog = useAppStore.getState().addLog;
    addLog(`Git diff: ${filePath}`);
    set({ loadingDiff: true });
    try {
      const res = await apiClient.call("git.diff", { repoPath, filePath, staged });
      addLog(`Git diff result: ${res.diff.length} chars`);
      set({ currentDiff: res, loadingDiff: false });
    } catch (err) {
      addLog(`Git diff error: ${err instanceof Error ? err.message : String(err)}`);
      set({ loadingDiff: false });
    }
  },

  clearDiff: () => set({ currentDiff: null }),
}));
