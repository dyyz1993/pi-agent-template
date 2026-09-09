/**
 * Context Store — 上下文管理（文件夹 / 连接器 / 工作文件）
 */
import { create } from "zustand";
import { apiClient } from "../lib/api-client";
import { useLogStore } from "./use-log-store";

export interface ContextFolder { path: string; name: string }
export interface Connector { id: string; name: string; type: string; enabled: boolean }
export interface WorkingFile { path: string; name: string; size?: number }

interface ContextState {
	folders: ContextFolder[];
	connectors: Connector[];
	workingFiles: WorkingFile[];
	fetchAll: () => Promise<void>;
	addFolder: (path: string) => Promise<void>;
	removeFolder: (path: string) => Promise<void>;
	toggleConnector: (id: string, enabled: boolean) => Promise<void>;
	addWorkingFile: (path: string) => Promise<void>;
	removeWorkingFile: (path: string) => Promise<void>;
}

export const useContextStore = create<ContextState>((set) => ({
	folders: [],
	connectors: [],
	workingFiles: [],

	fetchAll: async () => {
		try {
			const [f, c, w] = await Promise.all([
				apiClient.call("context.listFolders", {}),
				apiClient.call("context.listConnectors", {}),
				apiClient.call("context.listWorkingFiles", {}),
			]);
			set({ folders: f.folders, connectors: c.connectors, workingFiles: w.files });
		} catch (err) {
			useLogStore.getState().addLog("error", "Failed to fetch context", { error: err });
		}
	},

	addFolder: async (path) => {
		const res = await apiClient.call("context.addFolder", { path });
		set((s) => ({ folders: [...s.folders, res.folder] }));
	},

	removeFolder: async (path) => {
		await apiClient.call("context.removeFolder", { path });
		set((s) => ({ folders: s.folders.filter((f) => f.path !== path) }));
	},

	toggleConnector: async (id, enabled) => {
		const res = await apiClient.call("context.toggleConnector", { id, enabled });
		set((s) => ({
			connectors: s.connectors.map((c) => (c.id === id ? res.connector : c)),
		}));
	},

	addWorkingFile: async (path) => {
		const res = await apiClient.call("context.addWorkingFile", { path });
		set((s) => ({ workingFiles: [...s.workingFiles, res.file] }));
	},

	removeWorkingFile: async (path) => {
		await apiClient.call("context.removeWorkingFile", { path });
		set((s) => ({ workingFiles: s.workingFiles.filter((f) => f.path !== path) }));
	},
}));
