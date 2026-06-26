import { create } from 'zustand';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide';

/** 侧边栏三态折叠模式 */
export type SidebarMode = 'full' | 'icon' | 'hidden';

const PINNED_KEY = 'sidebar-pinned';
const WIDTH_KEY = 'sidebar-width';
const MODE_KEY = 'sidebar-mode';
const COLLAPSED_SECTIONS_KEY = 'sidebar-collapsed-sections';

export const SIDEBAR_MIN_WIDTH = 220;
export const SIDEBAR_MAX_WIDTH = 520;
export const SIDEBAR_ICON_WIDTH = 56;
const DEFAULT_WIDTH = 280;

/** 断点定义：mobile <768, tablet 768-1023, desktop 1024-1279, wide ≥1280 */
function getBreakpoint(width: number): Breakpoint {
	if (width < 768) return 'mobile';
	if (width < 1024) return 'tablet';
	if (width < 1280) return 'desktop';
	return 'wide';
}

interface SidebarState {
	breakpoint: Breakpoint;
	isPinned: boolean;
	drawerOpen: boolean;
	sidebarWidth: number;
	/** 三态折叠模式（替代 isPinned 在桌面端的主折叠语义） */
	sidebarMode: SidebarMode;
	/** 区块级折叠（section id 集合，如 "skills" / "sessions"） */
	collapsedSections: Set<string>;
	setPinned: (pinned: boolean) => void;
	setDrawerOpen: (open: boolean) => void;
	setSidebarWidth: (width: number) => void;
	setSidebarMode: (mode: SidebarMode) => void;
	/** 循环切换：full → icon → hidden → full */
	cycleSidebarMode: () => void;
	/** 切换区块折叠状态 */
	toggleSection: (id: string) => void;
	_setBreakpoint: (bp: Breakpoint) => void;
}

function readPinned(): boolean {
	try {
		const stored = localStorage.getItem(PINNED_KEY);
		if (stored !== null) return stored !== 'false';
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

function readMode(): SidebarMode {
	try {
		const v = localStorage.getItem(MODE_KEY);
		if (v === 'full' || v === 'icon' || v === 'hidden') return v;
	} catch {
		/* ignore */
	}
	return 'full';
}

function readCollapsedSections(): Set<string> {
	try {
		const v = localStorage.getItem(COLLAPSED_SECTIONS_KEY);
		if (v) return new Set(JSON.parse(v) as string[]);
	} catch {
		/* ignore */
	}
	return new Set();
}

function persistCollapsedSections(set: Set<string>): void {
	try {
		localStorage.setItem(COLLAPSED_SECTIONS_KEY, JSON.stringify([...set]));
	} catch {
		/* ignore */
	}
}

const initialWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;

export const useSidebarStore = create<SidebarState>((set, get) => ({
	breakpoint: getBreakpoint(initialWidth),
	isPinned: readPinned(),
	drawerOpen: false,
	sidebarWidth: readWidth(),
	sidebarMode: readMode(),
	collapsedSections: readCollapsedSections(),

	setPinned: (pinned) => {
		try {
			localStorage.setItem(PINNED_KEY, String(pinned));
		} catch {
			/* ignore */
		}
		set({ isPinned: pinned, drawerOpen: false });
	},

	setDrawerOpen: (open) => {
		set({ drawerOpen: open });
	},

	setSidebarWidth: (width) => {
		const clamped = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width));
		try {
			localStorage.setItem(WIDTH_KEY, String(clamped));
		} catch {
			/* ignore */
		}
		set({ sidebarWidth: clamped });
	},

	setSidebarMode: (mode) => {
		try {
			localStorage.setItem(MODE_KEY, mode);
		} catch {
			/* ignore */
		}
		set({ sidebarMode: mode });
	},

	cycleSidebarMode: () => {
		const order: SidebarMode[] = ['full', 'icon', 'hidden'];
		const current = get().sidebarMode;
		const next = order[(order.indexOf(current) + 1) % order.length] || 'full';
		try {
			localStorage.setItem(MODE_KEY, next);
		} catch {
			/* ignore */
		}
		set({ sidebarMode: next });
	},

	toggleSection: (id) => {
		const sections = new Set<string>(get().collapsedSections);
		if (sections.has(id)) {
			sections.delete(id);
		} else {
			sections.add(id);
		}
		persistCollapsedSections(sections);
		set({ collapsedSections: sections });
	},

	_setBreakpoint: (bp) => set({ breakpoint: bp }),
}));

/** 右侧面板状态 — 可调宽 + 可收起（类似左栏） */
export type RightPanelMode = 'full' | 'hidden';

const RIGHT_WIDTH_KEY = 'rightpanel-width';
const RIGHT_MODE_KEY = 'rightpanel-mode';
export const RIGHT_PANEL_MIN_WIDTH = 240;
export const RIGHT_PANEL_MAX_WIDTH = 600;
export const RIGHT_PANEL_DEFAULT_WIDTH = 320;

function readRightWidth(): number {
	try {
		const v = Number(localStorage.getItem(RIGHT_WIDTH_KEY));
		if (Number.isNaN(v) || v < RIGHT_PANEL_MIN_WIDTH || v > RIGHT_PANEL_MAX_WIDTH)
			return RIGHT_PANEL_DEFAULT_WIDTH;
		return v;
	} catch {
		return RIGHT_PANEL_DEFAULT_WIDTH;
	}
}

function readRightMode(): RightPanelMode {
	try {
		const v = localStorage.getItem(RIGHT_MODE_KEY);
		if (v === 'hidden') return 'hidden';
	} catch {
		/* ignore */
	}
	return 'full';
}

interface RightPanelState {
	width: number;
	mode: RightPanelMode;
	setWidth: (w: number) => void;
	setMode: (m: RightPanelMode) => void;
	toggleMode: () => void;
}

export const useRightPanelStore = create<RightPanelState>((set, get) => ({
	width: readRightWidth(),
	mode: readRightMode(),

	setWidth: (w) => {
		const clamped = Math.min(RIGHT_PANEL_MAX_WIDTH, Math.max(RIGHT_PANEL_MIN_WIDTH, w));
		try {
			localStorage.setItem(RIGHT_WIDTH_KEY, String(clamped));
		} catch {
			/* ignore */
		}
		set({ width: clamped });
	},

	setMode: (m) => {
		try {
			localStorage.setItem(RIGHT_MODE_KEY, m);
		} catch {
			/* ignore */
		}
		set({ mode: m });
	},

	toggleMode: () => {
		const next: RightPanelMode = get().mode === 'full' ? 'hidden' : 'full';
		try {
			localStorage.setItem(RIGHT_MODE_KEY, next);
		} catch {
			/* ignore */
		}
		set({ mode: next });
	},
}));
