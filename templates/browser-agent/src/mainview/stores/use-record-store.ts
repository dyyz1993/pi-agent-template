/**
 * Record Store — 浏览器录制状态管理
 *
 * 管理录制生命周期：开始 → 录制中 → 停止 → 录制结果
 */

import { create } from "zustand";
import { apiClient } from "../lib/api-client";
import { networkBus } from "../lib/network-bus";

export interface RecordingResult {
	actions: number;
	network: number;
	durationMs: number;
	steps: number;
	data: any;
}

interface RecordState {
	isRecording: boolean;
	recordSession: string | null;
	actionCount: number;
	lastRecording: RecordingResult | null;
	error: string | null;

	startRecording: () => Promise<void>;
	stopRecording: () => Promise<RecordingResult | null>;
	pollStatus: () => Promise<void>;
	clearError: () => void;
}

let pollTimer: ReturnType<typeof setInterval> | null = null;

export const useRecordStore = create<RecordState>((set, get) => ({
	isRecording: false,
	recordSession: null,
	actionCount: 0,
	lastRecording: null,
	error: null,

	startRecording: async () => {
		set({ error: null });
		try {
			networkBus.emitRequest("browser.recordStart", {});
			const result = await apiClient.call("browser.recordStart", {});
			networkBus.emitResponse("browser.recordStart", 0);

			if (result.success) {
				set({
					isRecording: true,
					recordSession: result.session,
					actionCount: 0,
					lastRecording: null,
				});

				// 启动轮询，更新操作计数
				if (pollTimer) clearInterval(pollTimer);
				pollTimer = setInterval(() => {
					get().pollStatus();
				}, 2000);
			} else {
				set({ error: "录制启动失败" });
			}
		} catch (err) {
			set({ error: err instanceof Error ? err.message : "录制启动失败" });
		}
	},

	stopRecording: async () => {
		const session = get().recordSession;
		if (!session) return null;

		// 停止轮询
		if (pollTimer) {
			clearInterval(pollTimer);
			pollTimer = null;
		}

		try {
			networkBus.emitRequest("browser.recordStop", { session });
			const result = await apiClient.call("browser.recordStop", { session });
			networkBus.emitResponse("browser.recordStop", 0);

			const recording: RecordingResult = {
				actions: result.actions || 0,
				network: result.network || 0,
				durationMs: result.durationMs || 0,
				steps: result.steps || 0,
				data: result.data,
			};

			set({
				isRecording: false,
				recordSession: null,
				actionCount: 0,
				lastRecording: recording,
			});

			return recording;
		} catch (err) {
			set({
				isRecording: false,
				recordSession: null,
				error: err instanceof Error ? err.message : "停止录制失败",
			});
			return null;
		}
	},

	pollStatus: async () => {
		const session = get().recordSession;
		if (!session) return;
		try {
			const result = await apiClient.call("browser.recordStatus", { session });
			if (result.recording) {
				set({ actionCount: result.actions || 0 });
			}
		} catch {
			/* ignore poll errors */
		}
	},

	clearError: () => set({ error: null }),
}));
