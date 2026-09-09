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
	/** 确保 UI 有一个可用的会话（空会话或已有会话），用户能直接输入 */
	ensureDefaultSession: () => Promise<string>;
	/** 智能新建：当前空会话未被使用时复用，否则新建 */
	newSessionSmart: () => Promise<string>;
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

	ensureDefaultSession: async () => {
		const state = get();
		// 已有选中的会话 → 不动
		if (state.currentSessionId) return state.currentSessionId;

		// 刷新列表
		await get().refreshSessions();
		const sessions = get().sessions;

		if (sessions.length > 0) {
			// 有历史会话 → 选中第一个
			const first = sessions[0]!;
			await get().loadSession(first.id);
			return first.id;
		}

		// 没有任何会话 → 创建空会话
		const sess = await get().createSession("新会话");
		await get().loadSession(sess.id);
		return sess.id;
	},

	newSessionSmart: async () => {
		const state = get();
		// 如果当前会话是空的（没有消息），直接复用，不创建新的
		if (state.currentSession) {
			const msgCount = state.currentSession.messages?.length || 0;
			if (msgCount === 0) {
				return state.currentSessionId!;
			}
		}
		// 否则创建新会话
		const sess = await get().createSession("新会话");
		await get().loadSession(sess.id);
		return sess.id;
	},
}));
