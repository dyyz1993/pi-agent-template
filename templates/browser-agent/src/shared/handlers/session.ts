/**
 * Session Handler — 会话 CRUD、消息、资源管理
 *
 * 对应 PRD §8 数据模型
 * 使用内存存储（符合 PRD §10.1 "会话不持久化" 已知问题，预留 SQLite 接口）
 */

import type { RPCServer } from "@dyyz1993/rpc-core";
import type { MethodParams, MethodResult } from "@dyyz1993/rpc-core";
import type { RPCMethods, HandlerOptions } from "../rpc-schema";

// ===== 类型定义 =====

type SessionStatus = "idle" | "running" | "done" | "error";

interface Message {
	id: string;
	role: "user" | "agent";
	text: string;
	steps?: { label: string; status: string; detail?: string }[];
	toolCalls?: { tool: string; input: string; output: string; status: string }[];
	summary?: { noteCount: number; imageCount: number; successRate: string; durationMs: number };
	error?: string;
	at: number;
}

interface Asset {
	id: string;
	kind: string;
	name: string;
	size?: number;
	mime: string;
	path?: string;
	url?: string;
	source: { sessionId: string; taskId: string; createdAt: number };
}

interface Session {
	id: string;
	title: string;
	messages: Message[];
	assets: Asset[];
	createdAt: number;
	status: SessionStatus;
}

// ===== 内存存储 =====

class SessionStore {
	private sessions = new Map<string, Session>();
	private seq = 0;

	private genId(prefix: string): string {
		this.seq += 1;
		return `${prefix}_${Date.now().toString(36)}${this.seq.toString(36)}`;
	}

	create(title?: string): Session {
		const id = this.genId("sess");
		const session: Session = {
			id,
			title: title || "新会话",
			messages: [],
			assets: [],
			createdAt: Date.now(),
			status: "idle",
		};
		this.sessions.set(id, session);
		return session;
	}

	get(id: string): Session | undefined {
		return this.sessions.get(id);
	}

	list(): Session[] {
		return Array.from(this.sessions.values()).sort((a, b) => b.createdAt - a.createdAt);
	}

	addMessage(sessionId: string, msg: Omit<Message, "id" | "at"> & { id?: string }): Message | null {
		const s = this.sessions.get(sessionId);
		if (!s) return null;
		const full: Message = { ...msg, id: msg.id || this.genId("msg"), at: Date.now() };
		s.messages.push(full);
		return full;
	}

	updateLastAgentMessage(sessionId: string, patch: Partial<Message>): boolean {
		const s = this.sessions.get(sessionId);
		if (!s) return false;
		for (let i = s.messages.length - 1; i >= 0; i--) {
			if (s.messages[i]?.role === "agent") {
				s.messages[i] = { ...s.messages[i]!, ...patch };
				return true;
			}
		}
		return false;
	}

	setStatus(sessionId: string, status: SessionStatus): void {
		const s = this.sessions.get(sessionId);
		if (s) s.status = status;
	}
}

const store = new SessionStore();

// ===== Handler 注册 =====

type RegisterFn = <K extends keyof RPCMethods & string>(
	method: K,
	handler: (params: MethodParams<RPCMethods, K>) => Promise<MethodResult<RPCMethods, K>>,
) => void;

export function register(server: RPCServer, _options: HandlerOptions): void {
	const r: RegisterFn = (method, handler) => {
		server.register(method, handler as (params: unknown) => Promise<unknown>);
	};

	r("session.create", async (params) => {
		const session = store.create(params.title);
		return { id: session.id, title: session.title, createdAt: session.createdAt };
	});

	r("session.get", async (params) => {
		const s = store.get(params.id);
		if (!s) return null;
		return { ...s };
	});

	r("session.list", async () => {
		const sessions = store.list().map((s) => ({
			id: s.id,
			title: s.title,
			createdAt: s.createdAt,
			status: s.status,
			messageCount: s.messages.length,
			assetCount: s.assets.length,
		}));
		return { sessions };
	});

	r("session.addMessage", async (params) => {
		const msg = store.addMessage(params.sessionId, params.message as any);
		return msg ? { id: msg.id } : null;
	});

	r("session.updateLastMessage", async (params) => {
		const ok = store.updateLastAgentMessage(params.sessionId, params.patch);
		return { ok };
	});

	r("session.setStatus", async (params) => {
		store.setStatus(params.sessionId, params.status as SessionStatus);
		return { ok: true };
	});

	r("session.getMessages", async (_params) => {
		// 由 Agent handler 管理，此处返回空
		return { messages: [] };
	});

	r("session.disposeAgent", async (_params) => {
		// 清理由 browser handler 处理
		return { ok: true };
	});
}
