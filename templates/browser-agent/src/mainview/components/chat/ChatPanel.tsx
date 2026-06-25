/**
 * ChatPanel — Agent 流式对话面板
 *
 * 对应 PRD §4.2-4.3：SSE 流式渲染、轮次展示、工具调用卡片
 * 通过 RPC 事件订阅接收 Agent 的实时推送
 */

import { useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { MessageSquare } from "lucide-react";
import { useChatStore } from "../../stores/use-chat-store";
import { useSessionStore } from "../../stores/use-session-store";
import { useConnectionStore } from "../../stores/use-connection-store";
import { MessageBubble } from "./MessageBubble";
import { CommandBar } from "./CommandBar";
import { apiClient } from "../../lib/api-client";

export function ChatPanel() {
	const { t } = useTranslation();
	const messages = useChatStore((s) => s.messages);
	const addUserMessage = useChatStore((s) => s.addUserMessage);
	const addAgentPlaceholder = useChatStore((s) => s.addAgentPlaceholder);
	const patchLastAgent = useChatStore((s) => s.patchLastAgent);
	const pushToolCall = useChatStore((s) => s.pushToolCall);
	const updateToolCall = useChatStore((s) => s.updateToolCall);
	const appendThinking = useChatStore((s) => s.appendThinking);
	const appendText = useChatStore((s) => s.appendText);
	const markTurnDone = useChatStore((s) => s.markTurnDone);
	const setMessages = useChatStore((s) => s.setMessages);

	const currentSessionId = useSessionStore((s) => s.currentSessionId);
	const running = useSessionStore((s) => s.running);
	const setRunning = useSessionStore((s) => s.setRunning);
	const loadSession = useSessionStore((s) => s.loadSession);
	const refreshSessions = useSessionStore((s) => s.refreshSessions);

	const activePlugins = useConnectionStore((s) => s.activePlugins);

	const inputRef = useRef<HTMLInputElement>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// 自动滚底
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	const currentSession = useSessionStore((s) => s.currentSession);

	// 从 currentSession 同步 messages
	useEffect(() => {
		if (currentSession?.messages) {
			setMessages(currentSession.messages);
		}
	}, [currentSession?.messages?.length]);

	const sendMessage = useCallback(async () => {
		const input = inputRef.current;
		if (!input || !input.value.trim() || running || !currentSessionId) return;

		const text = input.value.trim();
		input.value = "";
		setRunning(true);

		// 添加用户消息
		addUserMessage(text);

		// Agent 占位
		const messageId = `msg_${Date.now()}`;
		addAgentPlaceholder(messageId);

		const subs: string[] = [];

		try {
			// 订阅 Agent 事件
			const s1 = await apiClient.subscribe("browser.toolCall", (evt: any) => {
				console.debug("[Chat] browser.toolCall", evt);
				if (evt.messageId === messageId) pushToolCall(evt.toolCall);
			});
			subs.push(s1);

			const s2 = await apiClient.subscribe("browser.toolResult", (evt: any) => {
				console.debug("[Chat] browser.toolResult", evt);
				if (evt.messageId === messageId)
					updateToolCall(evt.toolCallId, evt.output);
			});
			subs.push(s2);

			const s3 = await apiClient.subscribe("browser.thinking", (evt: any) => {
				console.debug("[Chat] browser.thinking", evt);
				if (evt.messageId === messageId) appendThinking(evt.delta);
			});
			subs.push(s3);

			const s4 = await apiClient.subscribe("browser.textDelta", (evt: any) => {
				console.debug("[Chat] browser.textDelta", evt);
				if (evt.messageId === messageId) appendText(evt.delta);
			});
			subs.push(s4);

			const s5 = await apiClient.subscribe("browser.turn", (evt: any) => {
				console.debug("[Chat] browser.turn", evt);
				if (evt.messageId === messageId) markTurnDone(evt.turn);
			});
			subs.push(s5);

			const s6 = await apiClient.subscribe("browser.done", async (evt: any) => {
				console.debug("[Chat] browser.done", evt);
				if (evt.messageId === messageId) {
					patchLastAgent({ text: evt.reply, steps: evt.steps });
					setRunning(false);
					await refreshSessions();
					if (currentSessionId) await loadSession(currentSessionId);
				}
			});
			subs.push(s6);

			// 触发 Agent
			await apiClient.call("browser.agentChat", {
				message: text,
				sessionId: currentSessionId,
				activePlugins,
			});
		} catch (err: any) {
			patchLastAgent({ error: err.message });
			setRunning(false);
		} finally {
			subs.forEach((id) => apiClient.unsubscribe(id));
		}
	}, [
		currentSessionId,
		running,
		activePlugins,
		addUserMessage,
		addAgentPlaceholder,
		pushToolCall,
		updateToolCall,
		appendThinking,
		appendText,
		markTurnDone,
		patchLastAgent,
		setRunning,
		loadSession,
		refreshSessions,
	]);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	};

	const sessionAssets = currentSession?.assets || [];

	return (
		<div className="flex-1 flex flex-col overflow-hidden">
			{/* Header */}
			<div className="px-4 py-2 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border-primary)] flex items-center gap-2 flex-shrink-0">
				<MessageSquare className="w-4 h-4 text-[var(--color-text-accent)]" />
				<h2 className="text-sm font-semibold">{t("chat.title")}</h2>
				{messages.length > 0 && (
					<span className="ml-1 px-2 py-0.5 bg-[var(--color-accent)]/30 text-[var(--color-text-accent)] rounded text-[10px]">
						{messages.length}
					</span>
				)}
			</div>

			{/* 直接命令栏（不经 Agent） */}
			<CommandBar />

			{/* 消息区 */}
			<div className="flex-1 overflow-y-auto px-4 py-4" ref={messagesEndRef}>
				{messages.length === 0 ? (
					<div className="flex items-center justify-center h-full text-center">
						<div>
							<div className="text-4xl mb-4">◈</div>
							<div className="text-lg font-semibold mb-2">
								开始你的第一次采集
							</div>
							<div className="text-sm text-[var(--color-text-tertiary)] max-w-md">
								在下方输入需求，或点击侧栏的技能快速开始。
							</div>
						</div>
					</div>
				) : (
					<>
						{messages.map((m) => (
							<MessageBubble key={m.id} message={m} />
						))}

						{/* 内嵌资源 */}
						{sessionAssets.length > 0 && (
							<div style={{ marginTop: 16 }}>
								<InlineAssets assets={sessionAssets} />
							</div>
						)}
					</>
				)}
			</div>

			{/* 输入区 */}
			<div className="px-4 py-3 bg-[var(--color-bg-secondary)] border-t border-[var(--color-border-primary)] flex-shrink-0">
				<div className="flex gap-2">
					<input
						ref={inputRef}
						type="text"
						placeholder={
							running
								? "Agent 执行中..."
								: "输入需求，如：打开百度、搜索美妆、采集小红书"
						}
						disabled={running || !currentSessionId}
						onKeyDown={handleKeyDown}
						className="flex-1 px-3 py-2 text-sm bg-[var(--color-bg-tertiary)] rounded-lg text-[var(--color-text-primary)] border border-[var(--color-border-secondary)] focus:border-[var(--color-accent)] focus:outline-none disabled:opacity-50"
					/>
					<button
						onClick={sendMessage}
						disabled={running || !currentSessionId}
						className="px-4 py-2 text-sm bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded-lg transition-colors disabled:opacity-50"
					>
						{running ? "⏳" : t("chat.send")}
					</button>
				</div>

				{/* 快捷按钮 */}
				<div className="flex gap-2 mt-2 flex-wrap">
					{QUICK_ACTIONS.map((qa) => (
						<button
							key={qa.label}
							onClick={() => {
								if (inputRef.current) inputRef.current.value = qa.prompt;
							}}
							className="px-3 py-1 rounded-full text-xs border border-[var(--color-border-primary)] hover:bg-[var(--color-bg-hover)] transition-colors text-[var(--color-text-secondary)]"
						>
							{qa.icon} {qa.label}
						</button>
					))}
				</div>
			</div>
		</div>
	);
}

const QUICK_ACTIONS = [
	{ icon: "📸", label: "截图", prompt: "帮我截图当前页面" },
	{ icon: "📕", label: "小红书", prompt: "采集小红书首页热门笔记" },
	{ icon: "🌐", label: "豆瓣", prompt: "帮我采集豆瓣首页内容" },
	{ icon: "📋", label: "标签页", prompt: "列出当前所有标签页" },
];

function InlineAssets({ assets }: { assets: any[] }) {
	return (
		<div className="space-y-3">
			{assets
				.filter((a) => a.kind === "screenshot")
				.slice(0, 1)
				.map((s) => (
					<img
						key={s.id}
						src={s.dataUrl || `/api/assets/${s.id}/download`}
						alt="screenshot"
						className="rounded-lg border border-[var(--color-border-primary)] max-w-full"
					/>
				))}

			{assets.filter((a) => a.kind === "image" && a.path).length > 0 && (
				<div className="grid grid-cols-4 gap-1">
					{assets
						.filter((a) => a.kind === "image" && a.path)
						.slice(0, 8)
						.map((img) => (
							<img
								key={img.id}
								src={`/api/assets/${img.id}/download`}
								alt={img.name}
								className="rounded aspect-square object-cover border border-[var(--color-border-primary)]"
							/>
						))}
				</div>
			)}

			{assets.filter((a) => ["csv", "json", "report"].includes(a.kind))
				.length > 0 && (
				<div className="space-y-1">
					{assets
						.filter((a) => ["csv", "json", "report"].includes(a.kind))
						.map((f) => (
							<a
								key={f.id}
								href={`/api/assets/${f.id}/download`}
								download={f.name}
								className="flex items-center gap-2 px-3 py-2 rounded hover:bg-[var(--color-bg-hover)] text-sm"
							>
								<span>
									{f.kind === "csv"
										? "📊"
										: f.kind === "json"
											? "📋"
											: "📄"}
								</span>
								<span className="flex-1 truncate">{f.name}</span>
								<span className="text-xs text-[var(--color-text-tertiary)]">
									⬇
								</span>
							</a>
						))}
				</div>
			)}
		</div>
	);
}
