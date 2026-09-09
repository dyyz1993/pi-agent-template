import { create } from 'zustand';
import { apiClient } from '../lib/api-client';
import { useLogStore } from './use-log-store';
import { networkBus } from '../lib/network-bus';

export interface BrowserTab {
	index: number;
	url: string;
	title: string;
	active: boolean;
}

// 轮询定时器（模块级，避免重复创建）
let _pollTimer: ReturnType<typeof setInterval> | null = null;

interface ConnectionState {
	mode: 'web' | 'desktop';
	ready: boolean;
	// 浏览器连接状态
	browserStatus: 'offline' | 'online';
	browsers: { pluginId: string; name: string; tabs: number }[];
	tabs: BrowserTab[];
	activeTabIndex: number;
	selectedTabIndex: number | null; // null = 用活跃 tab
	// 插件
	plugins: { name: string; description: string }[];
	activePlugins: string[];
	// 系统信息
	systemInfo: unknown;

	setReady: (ready: boolean) => void;
	setMode: (mode: 'web' | 'desktop') => void;
	setBrowserStatus: (status: 'offline' | 'online', browsers?: unknown[]) => void;
	setTabs: (tabs: BrowserTab[], activeIndex: number) => void;
	selectTab: (index: number | null) => void;
	setPlugins: (plugins: unknown[]) => void;
	setActivePlugins: (plugins: string[]) => void;
	toggleActivePlugin: (name: string) => void;
	initializeConnection: () => void;
	checkBrowser: () => Promise<void>;
	loadTabs: () => Promise<void>;
	startConnectionPolling: () => void;
	stopConnectionPolling: () => void;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
	mode: 'web',
	ready: false,
	browserStatus: 'offline',
	browsers: [],
	tabs: [],
	activeTabIndex: 0,
	selectedTabIndex: null,
	plugins: [],
	activePlugins: [],
	systemInfo: null,

	setReady: (ready) => set({ ready }),
	setMode: (mode) => set({ mode }),

	setBrowserStatus: (status, browsers) => set({ browserStatus: status, browsers: browsers || [] }),

	setTabs: (tabs, activeIndex) => set({ tabs, activeTabIndex: activeIndex }),

	selectTab: (index) => set({ selectedTabIndex: index }),

	setPlugins: (plugins) => set({ plugins }),

	setActivePlugins: (plugins) => set({ activePlugins: plugins }),

	toggleActivePlugin: (name) => {
		const current = get().activePlugins;
		if (current.includes(name)) {
			set({ activePlugins: current.filter((p) => p !== name) });
		} else {
			set({ activePlugins: [...current, name] });
		}
	},

	initializeConnection: () => {
		const MAX_RETRIES = 5;
		let retries = 0;
		const init = async () => {
			try {
				await apiClient.initialize();
				const transport = apiClient.getTransport();
				set({
					mode: transport === 'ipc' ? 'desktop' : 'web',
					ready: true,
				});
				useLogStore
					.getState()
					.addLog(`${transport === 'ipc' ? 'Desktop' : 'Web'} mode - ${transport.toUpperCase()}`);

				// 初始检测浏览器连接 + 加载标签页
				await get().checkBrowser();
				if (get().browserStatus === 'online') {
					await get().loadTabs();
				} else {
					// 未连接 → 启动轮询，用户装好扩展后自动发现
					get().startConnectionPolling();
				}
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

	checkBrowser: async () => {
		try {
			const result = await apiClient.call('browser.checkConnection', {});
			const wasOffline = get().browserStatus === 'offline';
			set({
				browserStatus: result.connected ? 'online' : 'offline',
				browsers: result.browsers,
			});
			// 刚连上时，立即加载标签页
			if (wasOffline && result.connected) {
				await get().loadTabs();
			}
		} catch {
			set({ browserStatus: 'offline', browsers: [] });
		}
	},

	loadTabs: async () => {
		try {
			const result = await apiClient.call('browser.listTabs', {});
			set({ tabs: result.tabs, activeTabIndex: result.activeIndex });
		} catch (err) {
			networkBus.emitStatus(`加载标签页失败: ${err instanceof Error ? err.message : String(err)}`);
		}
	},

	/**
	 * 启动连接轮询 — 未连接时每 3 秒检测一次，连上后停止。
	 * 用户安装扩展后会自动发现。
	 */
	startConnectionPolling: () => {
		// 已连接就不轮询
		if (get().browserStatus === 'online') return;
		if (_pollTimer) return; // 已有轮询在跑

		_pollTimer = setInterval(async () => {
			await get().checkBrowser();
			// 连上了就停止轮询
			if (get().browserStatus === 'online') {
				if (_pollTimer) {
					clearInterval(_pollTimer);
					_pollTimer = null;
				}
			}
		}, 3000);
	},

	stopConnectionPolling: () => {
		if (_pollTimer) {
			clearInterval(_pollTimer);
			_pollTimer = null;
		}
	},
}));
