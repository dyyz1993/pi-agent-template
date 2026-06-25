/**
 * Chat Store — Agent 流式聊天
 *
 * 对应 PRD §4.2-4.3：SSE 流式渲染、轮次展示、工具调用卡片
 */

import { create } from "zustand";

export interface ToolCall {
	id: string;
	tool: string;
	input: string;
	output: string;
	status: "running" | "done";
}

export interface Turn {
	turn: number;
	toolCalls: ToolCall[];
	text: string;
	done: boolean;
}

export interface AgentMessage {
	id: string;
	role: "agent";
	text: string;
	turns: Turn[];
	thinking: string;
	steps?: { label: string; status: string; detail?: string }[];
	summary?: any;
	error?: string;
	at: number;
}

interface ChatState {
	messages: (AgentMessage | { id: string; role: "user"; text: string; at: number })[];

	// 流式回调，由 ChatPanel 绑定
	_onEventCallback: ((event: any) => void) | null;
	setOnEventCallback: (cb: ((event: any) => void) | null) => void;

	addUserMessage: (text: string) => void;
	addAgentPlaceholder: (id: string) => void;
	patchLastAgent: (patch: Partial<AgentMessage>) => void;
	pushToolCall: (tc: ToolCall) => void;
	updateToolCall: (tcId: string, output: string) => void;
	appendThinking: (delta: string) => void;
	appendText: (delta: string) => void;
	markTurnDone: (turnNum: number) => void;
	setMessages: (msgs: any[]) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
	messages: [],
	_onEventCallback: null,

	setOnEventCallback: (cb) => set({ _onEventCallback: cb }),

	addUserMessage: (text) =>
		set((s) => ({
			messages: [
				...s.messages,
				{ id: `msg_${Date.now()}`, role: "user" as const, text, at: Date.now() },
			],
		})),

	addAgentPlaceholder: (id) =>
		set((s) => ({
			messages: [
				...s.messages,
				{
					id,
					role: "agent" as const,
					text: "",
					turns: [],
					thinking: "",
					at: Date.now(),
				},
			],
		})),

	patchLastAgent: (patch) => {
		const msgs = [...get().messages];
		for (let i = msgs.length - 1; i >= 0; i--) {
			const entry = msgs[i];
			if (!entry || entry.role !== "agent") continue;
			msgs[i] = { ...(entry as AgentMessage), ...patch };
			break;
		}
		set({ messages: msgs });
	},

	pushToolCall: (tc) => {
		const msgs = [...get().messages];
		for (let i = msgs.length - 1; i >= 0; i--) {
			const entry = msgs[i];
			if (!entry || entry.role !== "agent") continue;
			const m = entry as AgentMessage;
			const turns = [...(m.turns || [])];
			const lastTurn = turns[turns.length - 1];
			if (turns.length === 0 || !lastTurn || lastTurn.done) {
				turns.push({
					turn: turns.length + 1,
					toolCalls: [],
					text: "",
					done: false,
				});
			}
			const currentTurn = turns[turns.length - 1];
			if (currentTurn) {
				currentTurn.toolCalls = [...currentTurn.toolCalls, tc];
			}
			msgs[i] = { ...m, turns };
			break;
		}
		set({ messages: msgs });
	},

	updateToolCall: (tcId, output) => {
		const msgs = [...get().messages];
		for (let i = msgs.length - 1; i >= 0; i--) {
			const entry = msgs[i];
			if (!entry || entry.role !== "agent") continue;
			const m = entry as AgentMessage;
			const turns = [...(m.turns || [])];
			const cur = turns[turns.length - 1];
			if (cur) {
				const calls = [...cur.toolCalls];
				const idx = calls.findIndex((c) => c.id === tcId);
				if (idx >= 0) {
					const c = calls[idx];
					if (c) calls[idx] = { ...c, output, status: "done" as const };
				} else {
					const ri =
						calls.length -
						1 -
						[...calls].reverse().findIndex((c) => c.status === "running");
					const c = calls[ri];
					if (c) calls[ri] = { ...c, output, status: "done" as const };
				}
				cur.toolCalls = calls;
			}
			msgs[i] = { ...m, turns };
			break;
		}
		set({ messages: msgs });
	},

	appendThinking: (delta) => {
		const msgs = [...get().messages];
		for (let i = msgs.length - 1; i >= 0; i--) {
			const entry = msgs[i];
			if (!entry || entry.role !== "agent") continue;
			const m = entry as AgentMessage;
			msgs[i] = { ...m, thinking: (m.thinking || "") + delta };
			break;
		}
		set({ messages: msgs });
	},

	appendText: (delta) => {
		const msgs = [...get().messages];
		for (let i = msgs.length - 1; i >= 0; i--) {
			const entry = msgs[i];
			if (!entry || entry.role !== "agent") continue;
			const m = entry as AgentMessage;
			const turns = [...(m.turns || [])];
			const openTurn = turns.find((t) => !t.done);
			if (openTurn) {
				openTurn.text = (openTurn.text || "") + delta;
			}
			msgs[i] = { ...m, turns, text: (m.text || "") + delta };
			break;
		}
		set({ messages: msgs });
	},

	markTurnDone: (_turnNum) => {
		const msgs = [...get().messages];
		for (let i = msgs.length - 1; i >= 0; i--) {
			const entry = msgs[i];
			if (!entry || entry.role !== "agent") continue;
			const m = entry as AgentMessage;
			const turns = [...(m.turns || [])];
			const lastTurn = turns[turns.length - 1];
			if (turns.length > 0 && lastTurn && !lastTurn.done) {
				turns[turns.length - 1] = {
					...lastTurn,
					done: true,
				};
			}
			msgs[i] = { ...m, turns };
			break;
		}
		set({ messages: msgs });
	},

	setMessages: (msgs) => set({ messages: msgs }),
}));
