/**
 * useAgentChat — Agent 流式对话 hook
 *
 * 封装 ChatPanel 和 SkillSidebar 共用的流式订阅逻辑：
 * 1. 订阅 browser.agentStart → 获取后端分配的 messageId
 * 2. 用正确的 messageId 订阅其余 5 个事件
 * 3. 触发 browser.agentChat
 * 4. 完成后自动清理订阅
 *
 * 关键修复：前端不自己生成 messageId，而是等后端 browser.agentStart
 * 返回实际的 messageId 后，再用它过滤后续事件。之前前后端 messageId
 * 格式不同导致 `evt.messageId === messageId` 永远 false。
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
			// 1. 添加用户消息（不创建 Agent 占位——等后端 browser.agentStart 确认 messageId）
			addUserMessage(message);
			setRunning(true);

			const subs: string[] = [];
			let backendMessageId: string | null = null;

			try {
				// 2. 先订阅 browser.agentStart（获取后端 messageId）
				subs.push(
					await apiClient.subscribe("browser.agentStart", (evt: any) => {
						console.debug("[Chat] browser.agentStart", evt);
						if (!backendMessageId && evt.messageId) {
							backendMessageId = evt.messageId;
							addAgentPlaceholder(evt.messageId);
						}
					}),
				);

				// 3. 等 agentStart 注册完成
				await new Promise((r) => setTimeout(r, 300));

				// 4. 订阅其余 5 个事件（用 backendMessageId 过滤）
				subs.push(
					await apiClient.subscribe("browser.toolCall", (evt: any) => {
						console.debug("[Chat] browser.toolCall", evt);
						if (backendMessageId && evt.messageId === backendMessageId) {
							pushToolCall(evt.toolCall);
						}
					}),
				);
				subs.push(
					await apiClient.subscribe("browser.toolResult", (evt: any) => {
						console.debug("[Chat] browser.toolResult", evt);
						if (backendMessageId && evt.messageId === backendMessageId) {
							updateToolCall(evt.toolCallId, evt.output);
						}
					}),
				);
				subs.push(
					await apiClient.subscribe("browser.thinking", (evt: any) => {
						console.debug("[Chat] browser.thinking", evt);
						if (backendMessageId && evt.messageId === backendMessageId) {
							appendThinking(evt.delta);
						}
					}),
				);
				subs.push(
					await apiClient.subscribe("browser.textDelta", (evt: any) => {
						console.debug("[Chat] browser.textDelta", evt);
						if (backendMessageId && evt.messageId === backendMessageId) {
							appendText(evt.delta);
						}
					}),
				);
				subs.push(
					await apiClient.subscribe("browser.turn", (evt: any) => {
						console.debug("[Chat] browser.turn", evt);
						if (backendMessageId && evt.messageId === backendMessageId) {
							markTurnDone(evt.turn);
						}
					}),
				);
				subs.push(
					await apiClient.subscribe("browser.done", async (evt: any) => {
						console.debug("[Chat] browser.done", evt);
						if (backendMessageId && evt.messageId === backendMessageId) {
							patchLastAgent({ text: evt.reply, steps: evt.steps });
							setRunning(false);
							if (refreshSessions) await refreshSessions();
							if (sessionId) await loadSession(sessionId);
						}
					}),
				);

				// 5. 等所有 subscribe 注册完成
				await new Promise((r) => setTimeout(r, 500));

				// 6. 触发 Agent
				console.log("[useAgentChat] Calling browser.agentChat...");
				const agentResult = await apiClient.call("browser.agentChat", {
					message,
					sessionId,
					activePlugins,
				});
				console.log("[useAgentChat] agentChat returned:", JSON.stringify(agentResult).slice(0, 200));

				// 7. Fallback：如果 browser.agentStart 事件没到（没创建占位），用 RPC 响应直接创建
				if (!backendMessageId && agentResult?.messageId) {
					backendMessageId = agentResult.messageId;
					addAgentPlaceholder(agentResult.messageId);
				}

				// 8. Fallback：用 RPC 响应填充 Agent 文本（即使流式事件没到）
				if (agentResult?.text) {
					patchLastAgent({ text: agentResult.text, steps: agentResult.steps || [] });
					setRunning(false);
				}
			} catch (err: any) {
				console.error("[useAgentChat] Error:", err);
				patchLastAgent({ error: err.message || "Agent 执行失败" });
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
