/**
 * View Store — 全局视图状态
 *
 * 管理当前激活的视图 Tab（Chat/Code/Cowork）+ 右侧面板折叠状态。
 */

import { create } from "zustand";

export type CenterTab = "chat" | "code" | "cowork";

interface ViewState {
	centerTab: CenterTab;
	setCenterTab: (tab: CenterTab) => void;
	rightPanelCollapsed: Record<string, boolean>;
	toggleRightPanel: (id: string) => void;
}

export const useViewStore = create<ViewState>((set) => ({
	centerTab: "cowork",
	setCenterTab: (tab) => set({ centerTab: tab }),
	rightPanelCollapsed: {},
	toggleRightPanel: (id) =>
		set((s) => ({
			rightPanelCollapsed: {
				...s.rightPanelCollapsed,
				[id]: !s.rightPanelCollapsed[id],
			},
		})),
}));
