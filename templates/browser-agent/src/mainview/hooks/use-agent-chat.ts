/**
 * useAgentChat — Agent 流式对话 hook
 *
 * 封装 ChatPanel 和 SkillSidebar 共用的流式订阅逻辑：
 * 1. 订阅 6 个 browser.* 事件
 * 2. 触发 browser.agentChat
 * 3. 完成后自动清理订阅
 *
 * 关键修复：subscribe 必须在 agentChat 之前完成注册，
 * 否则后端 emitEvent 找不到订阅者会丢弃事件。
 */

import { useCallback } from "react";
import { apiClient } from "../lib/api-client";
import { useChatStore } from "../stores/use-chat-store";
import { useSessionStore } from "../stores/use-session-store";

export function useAgentChat() {
	const addUserMessage = useChatStore((s) => s.addUserMessage);
	const addAgentPlaceholder = useChatStore((s) => s.addAgentPlaceholder);
	const pushToolCall = useChatStore((s) => s.pushToolCall);
	const updateToolCall = useChatStore((s) => s.updateToolCall);
	const appendThinking = useChatStore((s) => s.appendThinking);
	const appendText = useChatStore((s) => s.appendText);
	const markTurnDone = useChatStore((s) => s.markTurnDone);
	const patchLastAgent = useChatStore((s) => s.patchLastAgent);
	const setRunning = useSessionStore((s) => s.setRunning);
	const loadSession = useSessionStore((s) => s.loadSession);
	const refreshSessions = useSessionStore((s) => s.refreshSessions);

	const chat = useCallback(
		async (message: string, sessionId: string, activePlugins?: string[]): Promise<void> => {
			// 添加用户消息 + Agent 占位
			addUserMessage(message);
			const messageId = `msg_${Date.now()}`;
			addAgentPlaceholder(messageId);
			setRunning(true);

			const subs: string[] = [];

			try {
				// 订阅 6 个流式事件（必须在 agentChat 之前注册）
				subs.push(
					await apiClient.subscribe("browser.toolCall", (evt: any) => {
						console.debug("[Chat] browser.toolCall", evt);
						if (evt.messageId === messageId) pushToolCall(evt.toolCall);
					}),
				);
				subs.push(
					await apiClient.subscribe("browser.toolResult", (evt: any) => {
						console.debug("[Chat] browser.toolResult", evt);
						if (evt.messageId === messageId) updateToolCall(evt.toolCallId, evt.output);
					}),
				);
				subs.push(
					await apiClient.subscribe("browser.thinking", (evt: any) => {
						console.debug("[Chat] browser.thinking", evt);
						if (evt.messageId === messageId) appendThinking(evt.delta);
					}),
				);
				subs.push(
					await apiClient.subscribe("browser.textDelta", (evt: any) => {
						console.debug("[Chat] browser.textDelta", evt);
						if (evt.messageId === messageId) appendText(evt.delta);
					}),
				);
				subs.push(
					await apiClient.subscribe("browser.turn", (evt: any) => {
						console.debug("[Chat] browser.turn", evt);
						if (evt.messageId === messageId) markTurnDone(evt.turn);
					}),
				);
				subs.push(
					await apiClient.subscribe("browser.done", async (evt: any) => {
						console.debug("[Chat] browser.done", evt);
						if (evt.messageId === messageId) {
							patchLastAgent({ text: evt.reply, steps: evt.steps });
							setRunning(false);
							if (refreshSessions) await refreshSessions();
							if (sessionId) await loadSession(sessionId);
						}
					}),
				);

				// 等 subscribe 消息发到后端（fire-and-forget，给一点缓冲）
				await new Promise((r) => setTimeout(r, 200));

				// 触发 Agent
				await apiClient.call("browser.agentChat", {
					message,
					sessionId,
					activePlugins,
				});
			} catch (err: any) {
				patchLastAgent({ error: err.message });
				setRunning(false);
			} finally {
				subs.forEach((id) => apiClient.unsubscribe(id));
			}
		},
		[
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
		],
	);

	return { chat };
}
