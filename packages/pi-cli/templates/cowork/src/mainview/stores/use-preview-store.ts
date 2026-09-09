/**
 * Preview Store — 内嵌浏览器状态管理（Code Tab）
 */
import { create } from 'zustand';
import { apiClient } from '../lib/api-client';
import { useLogStore } from './use-log-store';

export type NavState = 'idle' | 'loading' | 'ready' | 'error';

export interface PreviewTab {
	id: string;
	url: string;
	title: string;
	state: NavState;
	canGoBack: boolean;
	canGoForward: boolean;
}

interface PreviewState {
	currentTab: PreviewTab | null;
	useIframe: boolean;
	navState: NavState;
	history: string[];
	openUrl: (url: string) => Promise<void>;
	navigate: (action: 'back' | 'forward' | 'reload') => Promise<void>;
	closeTab: () => Promise<void>;
	loadHistory: () => Promise<void>;
}

export const usePreviewStore = create<PreviewState>((set, get) => ({
	currentTab: null,
	useIframe: true,
	navState: 'idle',
	history: [],

	openUrl: async (url) => {
		const fullUrl = url.startsWith('http') ? url : `http://${url}`;
		set({ navState: 'loading' });

		try {
			const res = await apiClient.call('preview.open', { url: fullUrl });

			// 订阅导航状态事件（subId 暂不存储，订阅会自动管理）
			await apiClient.subscribe(
				'preview.navState',
				(tab: PreviewTab) => {
					if (tab.id === get().currentTab?.id) {
						set({ currentTab: tab, navState: tab.state });
					}
				},
				{},
			);

			set({
				currentTab: { ...res.tab, state: res.tab.state },
				useIframe: res.useIframe,
				navState: res.tab.state,
			});
		} catch (err) {
			useLogStore.getState().addLog('error', 'Failed to open URL', { error: err });
			set({ navState: 'error' });
		}
	},

	navigate: async (action) => {
		const tab = get().currentTab;
		if (!tab) return;
		set({ navState: 'loading' });
		try {
			await apiClient.call('preview.navigate', { tabId: tab.id, action });
		} catch (err) {
			useLogStore.getState().addLog('error', 'Navigation failed', { error: err });
			set({ navState: 'error' });
		}
	},

	closeTab: async () => {
		const tab = get().currentTab;
		if (tab) {
			try {
				await apiClient.call('preview.close', { tabId: tab.id });
			} catch {
				/* ignore */
			}
		}
		set({ currentTab: null, navState: 'idle' });
	},

	loadHistory: async () => {
		try {
			const res = await apiClient.call('preview.history', {});
			set({ history: res.urls });
		} catch {
			/* ignore */
		}
	},
}));
