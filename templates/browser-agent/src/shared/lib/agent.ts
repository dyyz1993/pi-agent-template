/**
 * Agent — 基于 pi SDK RpcClient 的浏览器自动化 Agent
 *
 * 架构（对应 PRD §6）：
 *   RpcClient（子进程 pi --mode rpc）
 *     ├── onEvent()     → 流式事件推送
 *     ├── getMessages() → 完整历史消息（JSONL 持久化）
 *     ├── promptAndWait() → 发送消息触发 Agent 循环
 *     └── setActiveTools() → 激活浏览器工具
 *
 *   每次 prompt 前注入 <browser-context> XML + 选中的插件提示
 */

import { RpcClient } from "@dyyz1993/pi-coding-agent";
import { spawn } from "child_process";

const XBROWSER_CMD = "/usr/local/bin/xbrowser";
const CDP_ENDPOINT = process.env.CDP_ENDPOINT || "http://localhost:9221";

/** Agent 轮次上限 */
const MAX_TURNS = Math.max(1, parseInt(process.env.AGENT_MAX_TURNS || "30", 10));
export const MAX_TURNS_CONFIG = MAX_TURNS;

/** Agent 整体超时 */
const AGENT_TIMEOUT_MS = Math.max(
	30_000,
	parseInt(process.env.AGENT_TIMEOUT_MS || String(5 * 60 * 1000), 10),
);

// ===== xbrowser 命令执行 =====

export async function execXbrowser(args: string[]): Promise<any> {
	const allArgs = [...args, "--cdp", CDP_ENDPOINT, "--json"];
	return new Promise((resolve, reject) => {
		const child = spawn(XBROWSER_CMD, allArgs, {
			stdio: ["ignore", "pipe", "pipe"],
			env: { ...process.env, NODE_OPTIONS: "" },
		});
		const chunks: Buffer[] = [];
		child.stdout.on("data", (d: Buffer) => chunks.push(d));
		const timeout = setTimeout(() => {
			child.kill("SIGTERM");
			reject(new Error("timeout"));
		}, 60000);
		child.on("error", (e) => {
			clearTimeout(timeout);
			reject(e);
		});
		child.on("close", () => {
			clearTimeout(timeout);
			const out = Buffer.concat(chunks as any).toString("utf8");
			const m = out.match(/\{[\s\S]*\}/);
			try {
				resolve(m ? JSON.parse(m[0]) : { success: false });
			} catch {
				resolve({ success: false });
			}
		});
	});
}

// ===== 浏览器上下文注入 =====

async function getBrowserContext(): Promise<string> {
	try {
		const tabsResult = await execXbrowser(["tab", "list"]);
		const tabs = tabsResult?.data?.tabs || [];
		const activeIndex = tabsResult?.data?.activeIndex ?? 0;

		let currentUrl = "";
		let currentTitle = "";
		try {
			currentUrl =
				(await execXbrowser(["eval", "location.href"]))?.data?.result || "";
		} catch {}
		try {
			currentTitle =
				(await execXbrowser(["eval", "document.title"]))?.data?.result || "";
		} catch {}

		const tabLines = tabs
			.map((t: any, i: number) => {
				const url = t.url || (i === activeIndex ? currentUrl : "");
				if (!url || url === "about:blank") return null;
				const title = t.title || (i === activeIndex ? currentTitle : "");
				const marker = i === activeIndex ? ' current="true"' : "";
				return `    <tab index="${i}" url="${url}" title="${title}"${marker} />`;
			})
			.filter(Boolean)
			.join("\n");

		return `<browser-context>
  <tabs total="${tabs.length}" active="${activeIndex}">
${tabLines || "    (无标签页)"}
  </tabs>
  <current_page url="${currentUrl}" title="${currentTitle}" />
</browser-context>`;
	} catch {
		return `<browser-context><error>无法获取浏览器状态</error></browser-context>`;
	}
}

// ===== RPC Client 管理（每个 sessionId 一个独立持久化 session） =====

const _clients = new Map<string, RpcClient>();

export async function getClient(sessionId: string): Promise<RpcClient | null> {
	if (_clients.has(sessionId)) return _clients.get(sessionId)!;

	try {
		const client = new RpcClient({
			cliPath: "node_modules/.bin/pi",
			args: ["--mode", "rpc"],
		});

		await client.start();

		try {
			await client.newSession(`browser-agent-${sessionId}`);
			console.log(`[Agent] New persistent session for ${sessionId}`);
		} catch (e: any) {
			console.log("[Agent] newSession warning:", e.message);
		}

		await client.setActiveTools([
			"xbrowser",
			"web_search",
			"fetch_content",
			"todo",
		]);

		_clients.set(sessionId, client);
		return client;
	} catch (e: any) {
		console.error("[Agent] RPC client init failed:", e.message);
		return null;
	}
}

/** 清理 Agent session */
export function disposeAgentSession(sessionId: string): void {
	const client = _clients.get(sessionId);
	if (client) {
		try {
			client.stop();
		} catch {}
		_clients.delete(sessionId);
	}
}

/** 获取 Agent session 的完整历史消息 */
export async function getAgentMessages(sessionId: string): Promise<any[]> {
	const client = _clients.get(sessionId);
	if (!client) return [];
	try {
		return (await client.getMessages()) || [];
	} catch {
		return [];
	}
}

// ===== Agent 事件类型 =====

export interface AgentEvent {
	type: string;
	text?: string;
	thinking?: string;
	toolName?: string;
	toolInput?: string;
	toolOutput?: string;
	toolCallId?: string;
	turn?: number;
}

export interface AgentReply {
	text: string;
	steps?: { tool: string; input: string; output: string }[];
	usedScrape?: boolean;
	messages?: any[];
}

/**
 * Agent 对话入口
 * @param message 用户消息
 * @param sessionId 会话 ID
 * @param onEvent 实时事件回调
 * @param activePlugins 选中插件列表
 */
export async function agentChat(
	message: string,
	sessionId: string,
	onEvent?: (event: AgentEvent) => void,
	activePlugins?: string[],
): Promise<AgentReply> {
	const client = await getClient(sessionId);
	if (!client) {
		return { text: "Agent 初始化失败" };
	}

	// 注入浏览器上下文 + 选中插件提示
	const browserContext = await getBrowserContext();
	let pluginHint = "";
	if (activePlugins && activePlugins.length > 0) {
		pluginHint = `\n<active-plugins>\n  用户选择了以下插件，优先使用：\n${activePlugins.map((p) => `  - ${p}`).join("\n")}\n</active-plugins>`;
	}
	const fullMessage = `${browserContext}${pluginHint}\n\n用户请求: ${message}`;

	const steps: { tool: string; input: string; output: string }[] = [];
	let fullText = "";
	let usedScrape = false;
	let turnCount = 0;
	let hitTurnLimit = false;

	const unsub = client.onEvent((event: any) => {
		// 工具开始
		if (event.type === "tool_execution_start") {
			const toolName = event.toolName || "";
			const args = event.args || event.input || event.arguments || {};
			if (toolName === "xbrowser") {
				const inputStr = JSON.stringify(args).toLowerCase();
				if (inputStr.includes("scrape") || inputStr.includes("crawl"))
					usedScrape = true;
			}
			const input = JSON.stringify(args).slice(0, 300);
			steps.push({ tool: toolName, input, output: "" });
			onEvent?.({
				type: "tool_call",
				toolName,
				toolInput: input,
				toolCallId: event.toolCallId,
			});
		}
		// 工具结束
		if (event.type === "tool_execution_end") {
			const last = steps[steps.length - 1];
			const output = (
				event.result?.content?.[0]?.text || event.text || ""
			).slice(0, 300);
			if (last) last.output = output;
			onEvent?.({
				type: "tool_result",
				toolName: last?.tool || event.toolName,
				toolOutput: output,
				toolCallId: event.toolCallId,
			});
		}
		// turn 结束
		if (event.type === "turn_end") {
			turnCount++;
			if (turnCount >= MAX_TURNS && !hitTurnLimit) {
				hitTurnLimit = true;
				try {
					client.abort();
				} catch {}
			}
			onEvent?.({ type: "turn", turn: turnCount });
		}
		// 消息更新
		if (event.type === "message_update") {
			const ae = event.assistantMessageEvent;
			if (ae?.type === "text_delta" && ae.delta) {
				fullText += ae.delta;
				onEvent?.({ type: "text", text: ae.delta });
			} else if (ae?.type === "thinking_delta" && ae.delta) {
				onEvent?.({ type: "thinking", text: ae.delta });
			}
		}
	});

	let timedOut = false;
	const timer = setTimeout(() => {
		timedOut = true;
		try {
			client.abort();
		} catch {}
	}, AGENT_TIMEOUT_MS);

	try {
		await client.promptAndWait(fullMessage, undefined, AGENT_TIMEOUT_MS);
	} catch (e: any) {
		if (!fullText && !timedOut && !hitTurnLimit)
			fullText = "⚠️ " + e.message;
	} finally {
		clearTimeout(timer);
	}

	// 轮次上限总结
	if (hitTurnLimit) {
		const summaryPrompt = `已达到工具调用轮次上限（${MAX_TURNS} 轮）。请根据以上操作历史，用简短要点总结：\n1. 已经完成了什么；\n2. 当前卡在哪一步；\n3. 如果用户想继续，下一步该做什么。\n不要再调用任何工具，直接给出总结。`;
		try {
			await client.promptAndWait(summaryPrompt, undefined, 60_000);
		} catch {}
		fullText += `\n\n_(已达轮次上限 ${MAX_TURNS}，以上为进展总结)_`;
	}

	if (typeof unsub === "function") unsub();

	let messages: any[] = [];
	try {
		messages = (await client.getMessages()) || [];
	} catch {}

	return {
		text: fullText.trim() || "(无回复)",
		steps: steps.length > 0 ? steps : undefined,
		usedScrape,
		messages,
	};
}
