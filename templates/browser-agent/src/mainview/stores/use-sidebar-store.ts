import { create } from "zustand";

export type Breakpoint = "mobile" | "tablet" | "desktop" | "wide";

const PINNED_KEY = "sidebar-pinned";
const WIDTH_KEY = "sidebar-width";
export const SIDEBAR_MIN_WIDTH = 180;
export const SIDEBAR_MAX_WIDTH = 480;
const DEFAULT_WIDTH = 240;

/** 断点定义：mobile <768, tablet 768-1023, desktop 1024-1279, wide ≥1280 */
function getBreakpoint(width: number): Breakpoint {
	if (width < 768) return "mobile";
	if (width < 1024) return "tablet";
	if (width < 1280) return "desktop";
	return "wide";
}

interface SidebarState {
	breakpoint: Breakpoint;
	isPinned: boolean;
	drawerOpen: boolean;
	sidebarWidth: number;
	setPinned: (pinned: boolean) => void;
	setDrawerOpen: (open: boolean) => void;
	setSidebarWidth: (width: number) => void;
	_setBreakpoint: (bp: Breakpoint) => void;
}

function readPinned(): boolean {
	try {
		const stored = localStorage.getItem(PINNED_KEY);
		if (stored !== null) return stored !== "false";
		return window.innerWidth >= 1024;
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

const initialWidth = typeof window !== "undefined" ? window.innerWidth : 1024;

export const useSidebarStore = create<SidebarState>((set) => ({
	breakpoint: getBreakpoint(initialWidth),
	isPinned: readPinned(),
	drawerOpen: false,
	sidebarWidth: readWidth(),

	setPinned: (pinned) => {
		try {
			localStorage.setItem(PINNED_KEY, String(pinned));
		} catch { /* ignore */ }
		set({ isPinned: pinned, drawerOpen: false });
	},

	setDrawerOpen: (open) => {
		set({ drawerOpen: open });
	},

	setSidebarWidth: (width) => {
		const clamped = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width));
		try {
			localStorage.setItem(WIDTH_KEY, String(clamped));
		} catch { /* ignore */ }
		set({ sidebarWidth: clamped });
	},

	_setBreakpoint: (bp) => set({ breakpoint: bp }),
}));

/** 资源面板（右侧）状态 */
interface PanelState {
	assetsVisible: boolean;
	assetsDrawerOpen: boolean;
	setAssetsVisible: (v: boolean) => void;
	setAssetsDrawerOpen: (open: boolean) => void;
}

export const useAssetsPanelStore = create<PanelState>((set) => ({
	assetsVisible: true,
	assetsDrawerOpen: false,
	setAssetsVisible: (v) => set({ assetsVisible: v }),
	setAssetsDrawerOpen: (open) => set({ assetsDrawerOpen: open }),
}));
