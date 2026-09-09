/**
 * View Store — 全局视图状态
 *
 * 管理当前激活的视图 Tab（会话/加工）。
 * TopBar、SidebarInner、AppLayout 都能访问，无需层层传递。
 */

import { create } from "zustand";

export type ViewTab = "chat" | "process";

interface ViewState {
	activeView: ViewTab;
	setActiveView: (view: ViewTab) => void;
}

export const useViewStore = create<ViewState>((set) => ({
	activeView: "chat",
	setActiveView: (view) => set({ activeView: view }),
}));
