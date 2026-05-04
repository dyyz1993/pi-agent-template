import { create } from "zustand";
import { apiClient } from "../lib/api-client";
import { useLogStore } from "./use-log-store";

interface ConnectionState {
  mode: "web" | "desktop";
  ready: boolean;
  setReady: (ready: boolean) => void;
  setMode: (mode: "web" | "desktop") => void;
  initializeConnection: () => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  mode: "web",
  ready: false,
  setReady: (ready) => set({ ready }),
  setMode: (mode) => set({ mode }),

  initializeConnection: () => {
    const MAX_RETRIES = 5;
    let retries = 0;
    const init = async () => {
      try {
        await apiClient.initialize();
        const transport = apiClient.getTransport();
        set({
          mode: transport === "ipc" ? "desktop" : "web",
          ready: true,
        });
        useLogStore.getState().addLog(`${transport === "ipc" ? "Desktop" : "Web"} mode - ${transport.toUpperCase()}`);
      } catch {
        retries++;
        if (retries < MAX_RETRIES) {
          setTimeout(init, 1000);
        } else {
          useLogStore.getState().addLog(`Failed to connect after ${MAX_RETRIES} retries`);
        }
      }
    };
    init();
  },
}));
