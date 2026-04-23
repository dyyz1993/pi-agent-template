import { create } from "zustand";

export type SidebarPanelId = "explorer" | "git" | "search";

const PINNED_KEY = "sidebar-pinned";
const WIDTH_KEY = "sidebar-width";
export const SIDEBAR_MIN_WIDTH = 180;
export const SIDEBAR_MAX_WIDTH = 480;
const DEFAULT_WIDTH = 240;

interface SidebarState {
  activePanel: SidebarPanelId | null;
  isPinned: boolean;
  drawerOpen: boolean;
  sidebarWidth: number;
  togglePanel: (id: SidebarPanelId) => void;
  setActivePanel: (id: SidebarPanelId | null) => void;
  setPinned: (pinned: boolean) => void;
  setDrawerOpen: (open: boolean) => void;
  setSidebarWidth: (width: number) => void;
}

function readPinned(): boolean {
  try {
    return localStorage.getItem(PINNED_KEY) !== "false";
  } catch {
    return true;
  }
}

function readWidth(): number {
  try {
    const v = Number(localStorage.getItem(WIDTH_KEY));
    if (Number.isNaN(v) || v < SIDEBAR_MIN_WIDTH || v > SIDEBAR_MAX_WIDTH) return DEFAULT_WIDTH;
    return v;
  } catch {
    return DEFAULT_WIDTH;
  }
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  activePanel: "explorer",
  isPinned: readPinned(),
  drawerOpen: false,
  sidebarWidth: readWidth(),

  togglePanel: (id) => {
    const { activePanel, isPinned } = get();
    if (activePanel === id) {
      set({ activePanel: null, drawerOpen: false });
    } else {
      set({ activePanel: id, drawerOpen: !isPinned });
    }
  },

  setActivePanel: (id) => set({ activePanel: id }),

  setPinned: (pinned) => {
    try {
      localStorage.setItem(PINNED_KEY, String(pinned));
    } catch { /* ignore */ }
    set({ isPinned: pinned, drawerOpen: false });
  },

  setDrawerOpen: (open) => {
    if (!open) {
      const { isPinned } = get();
      if (!isPinned) set({ drawerOpen: false, activePanel: null });
      else set({ drawerOpen: false });
    } else {
      set({ drawerOpen: true });
    }
  },

  setSidebarWidth: (width) => {
    const clamped = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width));
    try {
      localStorage.setItem(WIDTH_KEY, String(clamped));
    } catch { /* ignore */ }
    set({ sidebarWidth: clamped });
  },
}));
