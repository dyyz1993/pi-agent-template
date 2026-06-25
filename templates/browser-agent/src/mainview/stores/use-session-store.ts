/**
 * Session Store — 会话管理
 *
 * 对应 PRD §8 数据模型：会话 CRUD、消息管理
 */

import { create } from "zustand";
import { apiClient } from "../lib/api-client";

interface Message {
	id: string;
	role: "user" | "agent";
	text: string;
	steps?: { label: string; status: string; detail?: string }[];
	toolCalls?: { tool: string; input: string; output: string; status: string }[];
	thinking?: string;
	turns?: any[];
	summary?: any;
	error?: string;
	at: number;
}

interface SessionSummary {
	id: string;
	title: string;
	createdAt: number;
	status: string;
	messageCount: number;
	assetCount: number;
}

interface SessionDetail {
	id: string;
	title: string;
	messages: Message[];
	assets: any[];
	createdAt: number;
	status: string;
}

interface SessionState {
	// 会话列表
	sessions: SessionSummary[];
	currentSessionId: string | null;
	currentSession: SessionDetail | null;
	running: boolean;

	// Actions
	setRunning: (running: boolean) => void;
	refreshSessions: () => Promise<void>;
	createSession: (title?: string) => Promise<SessionSummary>;
	loadSession: (id: string) => Promise<void>;
	patchCurrentSession: (patch: Partial<SessionDetail>) => void;
	patchLastAgentMessage: (patch: Partial<Message>) => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
	sessions: [],
	currentSessionId: null,
	currentSession: null,
	running: false,

	setRunning: (running) => set({ running }),

	refreshSessions: async () => {
		try {
			const result = await apiClient.call("session.list", {});
			set({ sessions: result.sessions });
		} catch (err) {
			console.error("Failed to load sessions", err);
		}
	},

		createSession: async (title) => {
			const result = await apiClient.call("session.create", { title }) as SessionSummary;
			await get().refreshSessions();
			return result;
		},

	loadSession: async (id) => {
		try {
			const session = await apiClient.call("session.get", { id });
			if (session) {
				set({ currentSessionId: id, currentSession: session });
			}
		} catch (err) {
			console.error("Failed to load session", err);
		}
	},

	patchCurrentSession: (patch) => {
		const cur = get().currentSession;
		if (cur) {
			set({ currentSession: { ...cur, ...patch } });
		}
	},

	patchLastAgentMessage: (patch) => {
			const cur = get().currentSession;
			if (!cur) return;
			const msgs = [...(cur.messages || [])];
			for (let i = msgs.length - 1; i >= 0; i--) {
				const m = msgs[i];
				if (!m || m.role !== "agent") continue;
				msgs[i] = { ...m, ...patch };
				break;
			}
			set({ currentSession: { ...cur, messages: msgs } });
		},
}));
