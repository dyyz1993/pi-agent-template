import { create } from "zustand";
import { apiClient } from "../lib/api-client";
import { useLogStore } from "./use-log-store";
import { networkBus } from "../lib/network-bus";

export interface BrowserTab {
	index: number;
	url: string;
	title: string;
	active: boolean;
}

interface ConnectionState {
	mode: "web" | "desktop";
	ready: boolean;
	// 浏览器连接状态
	browserStatus: "offline" | "online";
	browsers: { pluginId: string; name: string; tabs: number }[];
	tabs: BrowserTab[];
	activeTabIndex: number;
	selectedTabIndex: number | null; // null = 用活跃 tab
	// 插件
	plugins: { name: string; description: string }[];
	activePlugins: string[];
	// 系统信息
	systemInfo: any;

	setReady: (ready: boolean) => void;
	setMode: (mode: "web" | "desktop") => void;
	setBrowserStatus: (status: "offline" | "online", browsers?: any[]) => void;
	setTabs: (tabs: BrowserTab[], activeIndex: number) => void;
	selectTab: (index: number | null) => void;
	setPlugins: (plugins: any[]) => void;
	setActivePlugins: (plugins: string[]) => void;
	toggleActivePlugin: (name: string) => void;
	initializeConnection: () => void;
	checkBrowser: () => Promise<void>;
	loadTabs: () => Promise<void>;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
	mode: "web",
	ready: false,
	browserStatus: "offline",
	browsers: [],
	tabs: [],
	activeTabIndex: 0,
	selectedTabIndex: null,
	plugins: [],
	activePlugins: [],
	systemInfo: null,

	setReady: (ready) => set({ ready }),
	setMode: (mode) => set({ mode }),

	setBrowserStatus: (status, browsers) =>
		set({ browserStatus: status, browsers: browsers || [] }),

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
					mode: transport === "ipc" ? "desktop" : "web",
					ready: true,
				});
				useLogStore
					.getState()
					.addLog(
						`${transport === "ipc" ? "Desktop" : "Web"} mode - ${transport.toUpperCase()}`,
					);

				// 初始检测浏览器连接 + 加载标签页
				await get().checkBrowser();
				if (get().browserStatus === "online") {
					await get().loadTabs();
				}
			} catch {
				retries++;
				if (retries < MAX_RETRIES) {
					setTimeout(init, 1000);
				} else {
					useLogStore
						.getState()
						.addLog(`Failed to connect after ${MAX_RETRIES} retries`);
				}
			}
		};
		init();
	},

	checkBrowser: async () => {
		try {
			const result = await apiClient.call("browser.checkConnection", {});
			set({
				browserStatus: result.connected ? "online" : "offline",
				browsers: result.browsers,
			});
		} catch {
			set({ browserStatus: "offline", browsers: [] });
		}
	},

	loadTabs: async () => {
		try {
			const result = await apiClient.call("browser.listTabs", {});
			set({ tabs: result.tabs, activeTabIndex: result.activeIndex });
		} catch (err) {
			networkBus.emitStatus(`加载标签页失败: ${err instanceof Error ? err.message : String(err)}`);
		}
	},
}));
