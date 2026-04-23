import { create } from "zustand";

export type SidebarPanelId = "explorer" | "git" | "search";

interface SidebarState {
  activePanel: SidebarPanelId | null;
  togglePanel: (id: SidebarPanelId) => void;
  setActivePanel: (id: SidebarPanelId | null) => void;
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  activePanel: "explorer",

  togglePanel: (id) => {
    const { activePanel } = get();
    set({ activePanel: activePanel === id ? null : id });
  },

  setActivePanel: (id) => set({ activePanel: id }),
}));
