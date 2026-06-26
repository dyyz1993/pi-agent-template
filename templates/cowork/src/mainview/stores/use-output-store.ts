/**
 * Output Store — 产出物管理（Artifacts）
 */
import { create } from "zustand";
import { apiClient } from "../lib/api-client";
import { useLogStore } from "./use-log-store";

export interface Output {
	id: string;
	name: string;
	kind: "file" | "snippet" | "link";
	path?: string;
	content?: string;
	size?: number;
	taskId?: string;
	createdAt: number;
}

interface OutputState {
	outputs: Output[];
	fetchOutputs: () => Promise<void>;
	addOutput: (name: string, kind: Output["kind"], path?: string, taskId?: string) => Promise<void>;
	removeOutput: (id: string) => Promise<void>;
}

export const useOutputStore = create<OutputState>((set) => ({
	outputs: [],

	fetchOutputs: async () => {
		try {
			const res = await apiClient.call("output.list", {});
			set({ outputs: res.outputs });
		} catch (err) {
			useLogStore.getState().addLog("error", "Failed to fetch outputs", { error: err });
		}
	},

	addOutput: async (name, kind, path, taskId) => {
		const res = await apiClient.call("output.add", { name, kind, path, taskId });
		set((s) => ({ outputs: [res.output, ...s.outputs] }));
	},

	removeOutput: async (id) => {
		await apiClient.call("output.remove", { id });
		set((s) => ({ outputs: s.outputs.filter((o) => o.id !== id) }));
	},
}));
