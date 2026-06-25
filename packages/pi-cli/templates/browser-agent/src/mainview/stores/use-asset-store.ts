/**
 * Asset Store — 资源管理
 *
 * 对应 PRD §4.6 资源管理 + §8 数据模型
 */

import { create } from "zustand";

interface Asset {
	id: string;
	kind: string;
	name: string;
	size?: number;
	mime: string;
	path?: string;
	url?: string;
	dataUrl?: string;
	source: { sessionId: string; taskId: string; createdAt: number };
}

interface AssetState {
	// 当前展示的资源列表
	assets: Asset[];

	// Actions
	setAssets: (assets: Asset[]) => void;
	addAsset: (asset: Asset) => void;
	addAssets: (assets: Asset[]) => void;
	clearAssets: () => void;
	/** 下载资源 */
	downloadAsset: (assetId: string) => void;
	/** 获取资源下载 URL */
	getDownloadUrl: (asset: Asset) => string;
}

export const useAssetStore = create<AssetState>((set, get) => ({
	assets: [],

	setAssets: (assets) => set({ assets }),

	addAsset: (asset) =>
		set((s) => ({ assets: [...s.assets, asset] })),

	addAssets: (assets) =>
		set((s) => ({ assets: [...s.assets, ...assets] })),

	clearAssets: () => set({ assets: [] }),

	downloadAsset: (assetId: string) => {
		const asset = get().assets.find((a) => a.id === assetId);
		if (!asset) return;
		const url = get().getDownloadUrl(asset);
		const a = document.createElement("a");
		a.href = url;
		a.download = asset.name;
		a.click();
	},

	getDownloadUrl: (asset: Asset) => {
		if (asset.dataUrl) return asset.dataUrl;
		if (asset.path) return `/api/assets/${asset.id}/download`;
		if (asset.url) return asset.url;
		return "";
	},
}));
