/**
 * Browser Handler — 浏览器控制、Agent 对话、采集
 *
 * 对应 PRD §7 API 设计 + §6 Agent 设计
 */

import type { RPCServer } from "@dyyz1993/rpc-core";
import type { MethodParams, MethodResult } from "@dyyz1993/rpc-core";
import type { RPCMethods, HandlerOptions } from "../rpc-schema";
import { createLogger } from "../lib/logger";
import {
	execXbrowser,
	agentChat,
} from "../lib/agent";
import { getOnlineBrowser, scrapeXhs } from "../lib/cdp";

const log = createLogger("browser" as any);

// ===== 内部状态 =====

let _pluginsCache: any[] | null = null;
let _pluginsCacheTime = 0;
let _systemCache: { data: any; ts: number } = { data: null, ts: 0 };

/**
 * 将命令字符串拆分为参数数组，支持引号包裹的参数（如 URL）。
 * 例如："scrape https://example.com --limit 5" → ["scrape", "https://example.com", "--limit", "5"]
 */
function parseCommandString(cmd: string): string[] {
	const args: string[] = [];
	const regex = /"([^"]*)"|'([^']*)'|(\S+)/g;
	let match: RegExpExecArray | null;
	while ((match = regex.exec(cmd)) !== null) {
		args.push(match[1] ?? match[2] ?? match[3] ?? "");
	}
	return args;
}

// ===== xbrowser 版本检测 =====

async function detectXbrowser(): Promise<{ available: boolean; version: string | null }> {
	try {
		const { execFileSync } = await import("child_process");
		const out = execFileSync("/usr/local/bin/xbrowser", ["--version"], {
			timeout: 5000,
			encoding: "utf8",
			env: { ...process.env, NODE_OPTIONS: "" },
		}).trim();
		const m = out.match(/v?(\d+\.\d+\.\d+)/);
		return { available: true, version: m ? (m[1] ?? null) : null };
	} catch {
		return { available: false, version: null };
	}
}

async function getSystemInfo(force = false): Promise<any> {
	const now = Date.now();
	if (!force && _systemCache.data && now - _systemCache.ts < 30_000) {
		return _systemCache.data;
	}
	const [xbrowser, browser] = await Promise.all([
		detectXbrowser(),
		getOnlineBrowser()
			.then((b) => ({ connected: !!b, browsers: b ? [b] : [] }))
			.catch(() => ({ connected: false, browsers: [] })),
	]);
	const data = { xbrowser, browser, serverVersion: "0.4.0" };
	_systemCache.data = data;
	_systemCache.ts = now;
	return data;
}

// ===== Handler 注册 =====

type RegisterFn = <K extends keyof RPCMethods & string>(
	method: K,
	handler: (params: MethodParams<RPCMethods, K>) => Promise<MethodResult<RPCMethods, K>>,
) => void;

export function register(server: RPCServer, _options: HandlerOptions): void {
	const r: RegisterFn = (method, handler) => {
		server.register(method, handler as (params: unknown) => Promise<unknown>);
	};

	r("browser.getSystemInfo", async () => {
		return await getSystemInfo();
	});

	r("browser.checkConnection", async (params) => {
		const browser = await getOnlineBrowser(params.pluginId);
		return {
			connected: !!browser,
			browserCount: browser ? 1 : 0,
			browsers: browser ? [browser] : [],
		};
	});

	r("browser.getConnectionGuide", async () => {
		const cdpEndpoint = process.env.CDP_ENDPOINT || "http://localhost:9221";

		// 检测 cdp-tunnel 是否在跑
		let cdpTunnelRunning = false;
		try {
			const { execSync } = await import("child_process");
			execSync(`curl -s -o /dev/null -w "%{http_code}" --max-time 2 ${cdpEndpoint}/json/version`, {
				timeout: 3000,
				env: { ...process.env, NODE_OPTIONS: "" },
			});
			cdpTunnelRunning = true;
		} catch {
			cdpTunnelRunning = false;
		}

		// 检测 cdp-tunnel 版本
		let cdpTunnelVersion: string | null = null;
		try {
			const { execSync } = await import("child_process");
			const out = execSync("cdp-tunnel --version", {
				timeout: 3000,
				encoding: "utf8",
				env: { ...process.env, NODE_OPTIONS: "" },
			}).trim();
			cdpTunnelVersion = out || null;
		} catch {
			cdpTunnelVersion = null;
		}

		// 检测 xbrowser 版本
		const xbInfo = await detectXbrowser();

		const steps = [
			{
				title: "安装 cdp-tunnel",
				detail: "brew install cdp-tunnel 或 npm i -g @xbrowser/cdp-tunnel",
				done: cdpTunnelVersion !== null,
			},
			{
				title: "启动 cdp-tunnel",
				detail: `运行 cdp-tunnel（当前状态：${cdpTunnelRunning ? "✅ 运行中" : "❌ 未运行"}）`,
				done: cdpTunnelRunning,
			},
			{
				title: "安装 Chrome 扩展",
				detail: "在 Chrome 加载 Browser Agent 扩展，连接到 cdp-tunnel",
				done: false,
			},
			{
				title: "安装 xbrowser CLI",
				detail: "brew install xbrowser 或 npm i -g @xbrowser/cli",
				done: xbInfo.available,
			},
		];

		return {
			cdpEndpoint,
			cdpTunnelRunning,
			cdpTunnelVersion,
			xbrowserVersion: xbInfo.version,
			steps,
		};
	});

	r("browser.listTabs", async () => {
		try {
			const result = await execXbrowser(["tab", "list"]);
			const tabs = result?.data?.tabs || [];
			return {
				total: tabs.length,
				activeIndex: result?.data?.activeIndex ?? 0,
				tabs: tabs.map((t: any) => ({
					index: t.index,
					url: t.url,
					title: t.title,
					active: t.active,
				})),
			};
		} catch (e: any) {
			log.error("listTabs failed", { error: e.message });
			return { total: 0, activeIndex: 0, tabs: [] };
		}
	});

	r("browser.listPlugins", async () => {
		if (_pluginsCache && Date.now() - _pluginsCacheTime < 5 * 60 * 1000) {
			return { plugins: _pluginsCache };
		}
		try {
			const { execFileSync } = await import("child_process");
			const { tmpdir } = await import("os");
			const { join } = await import("path");
			const { unlinkSync, existsSync, readFileSync } = await import("fs");
			const tmpFile = join(tmpdir(), `xb-plugins-${Date.now()}.json`);
			execFileSync("sh", [
				"-c",
				`'/usr/local/bin/xbrowser' plugin list --json > '${tmpFile}' 2>/dev/null`,
			], {
				timeout: 30000,
				env: { ...process.env, NODE_OPTIONS: "" },
			});
			let plugins: any[] = [];
			if (existsSync(tmpFile)) {
				const raw = readFileSync(tmpFile, "utf8").trim();
				try {
					const data = JSON.parse(raw);
					const rawList = Array.isArray(data) ? data : data?.plugins || [];
					plugins = rawList.map((p: any) => ({
						name: p.name || p.id || p,
						description: p.description || p.metadata?.description || "",
					}));
				} catch {}
				try {
					unlinkSync(tmpFile);
				} catch {}
			}
			_pluginsCache = plugins;
			_pluginsCacheTime = Date.now();
			return { plugins };
		} catch (e: any) {
			log.error("listPlugins failed", { error: e.message });
			return { plugins: [] };
		}
	});

	r("browser.execXbrowser", async (params) => {
		try {
			// 把命令字符串拆分为参数数组（支持引号包裹的 URL 等）
			const args = parseCommandString(params.command);

			// 如果指定了 tabIndex，自动注入 --tab 参数
			if (params.tabIndex !== undefined && params.tabIndex >= 0) {
				// 避免重复添加 --tab
				if (!args.some((a) => a === "--tab" || a === "-t")) {
					args.push("--tab", String(params.tabIndex));
				}
			}

			const result = await execXbrowser(args);
			return { success: !!result?.success, data: result?.data };
		} catch (e: any) {
			return { success: false, data: { error: e.message } };
		}
	});

	r("browser.agentChat", async (params) => {
		const { message, sessionId, activePlugins } = params;
		if (!message || !sessionId) {
			return { messageId: "", text: "缺少必要参数", steps: [] };
		}

		const messageId = `msg_${Date.now().toString(36)}`;

		// 发送 Agent 开始事件
		server.emitEvent("browser.agentStart", {
			messageId,
			reply: "🤔 思考中...",
		});

		// 检查浏览器连接
		const browser = await getOnlineBrowser();
		if (!browser) {
			server.emitEvent("browser.done", {
				messageId,
				reply: "⚠️ 没有检测到在线浏览器，请先安装并加载 Chrome 扩展。",
				steps: [],
			});
			return {
				messageId,
				text: "⚠️ 没有检测到在线浏览器",
				steps: [],
			};
		}

		// 调用 Agent
		const liveToolCalls: any[] = [];
		const agentResult = await agentChat(
			message,
			sessionId,
			(event) => {
				if (event.type === "tool_call") {
					const tcId = event.toolCallId || `tc_${liveToolCalls.length}`;
					liveToolCalls.push({
						id: tcId,
						tool: event.toolName,
						input: event.toolInput || "",
						output: "",
						status: "running",
					});
					server.emitEvent("browser.toolCall", {
						messageId,
						toolCall: {
							id: tcId,
							tool: event.toolName || "",
							input: event.toolInput || "",
							status: "running",
						},
					});
				}
				if (event.type === "tool_result") {
					const last = liveToolCalls[liveToolCalls.length - 1];
					const tcId = event.toolCallId || last?.id;
					if (last) {
						last.output = event.toolOutput || "";
						last.status = "done";
					}
					server.emitEvent("browser.toolResult", {
						messageId,
						toolCallId: tcId,
						output: event.toolOutput || "",
					});
				}
				if (event.type === "thinking" && event.text) {
					server.emitEvent("browser.thinking", {
						messageId,
						delta: event.text,
					});
				}
				if (event.type === "turn" && event.turn) {
					server.emitEvent("browser.turn", {
						messageId,
						turn: event.turn,
						maxTurns: Number(process.env.AGENT_MAX_TURNS || 30),
					});
				}
				if (event.type === "text" && event.text) {
					server.emitEvent("browser.textDelta", {
						messageId,
						delta: event.text,
					});
				}
			},
			activePlugins,
		);

		const steps = liveToolCalls.map((tc) => ({
			label: tc.tool,
			status: "done" as const,
			detail: tc.input.slice(0, 80),
		}));

		// 触发采集
		let finalText = agentResult.text;
		if (agentResult.usedScrape) {
			const urlMatch = message.match(/https?:\/\/[^\s,，""''）\)]+/);
			const targetUrl =
				urlMatch?.[0] || "https://www.xiaohongshu.com/explore";

			const scrapeResult = await scrapeXhs(
				"",
				sessionId,
				messageId,
				"",
				(scrapeSteps) => {
					const allSteps = [...steps, ...scrapeSteps];
					server.emitEvent("browser.progress", {
						messageId,
						steps: allSteps,
					});
				},
				{ url: targetUrl },
			);

			finalText =
				agentResult.text +
				`\n\n✅ 采集完成: ${scrapeResult.notes.length} 条笔记`;
		}

		// 发送完成事件
		const allSteps = steps;
		server.emitEvent("browser.done", {
			messageId,
			reply: finalText,
			steps: allSteps,
		});

		return { messageId, text: finalText, steps: allSteps };
	});
}
