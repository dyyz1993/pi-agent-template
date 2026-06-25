/**
 * Browser Handler — 浏览器控制、Agent 对话、采集
 *
 * 对应 PRD §7 API 设计 + §6 Agent 设计
 */

import type { RPCServer } from '@dyyz1993/rpc-core';
import type { MethodParams, MethodResult } from '@dyyz1993/rpc-core';
import type { RPCMethods, HandlerOptions } from '../rpc-schema';
import { createLogger } from '../lib/logger';
import { execXbrowser, agentChat } from '../lib/agent';
import { getOnlineBrowser, scrapeXhs } from '../lib/cdp';
import { runMockAgentChat } from '../lib/mock-stream';
import { config } from '../../server-config';

const log = createLogger('browser' as unknown as string);

// ===== 内部状态 =====

let _pluginsCache: unknown[] | null = null;
let _pluginsCacheTime = 0;
const _systemCache: { data: unknown; ts: number } = { data: null, ts: 0 };

/**
 * 将命令字符串拆分为参数数组，支持引号包裹的参数（如 URL）。
 * 例如："scrape https://example.com --limit 5" → ["scrape", "https://example.com", "--limit", "5"]
 */
function parseCommandString(cmd: string): string[] {
	const args: string[] = [];
	const regex = /"([^"]*)"|'([^']*)'|(\S+)/g;
	let match: RegExpExecArray | null;
	while ((match = regex.exec(cmd)) !== null) {
		args.push(match[1] ?? match[2] ?? match[3] ?? '');
	}
	return args;
}

/**
 * Web 模式下禁止的 xbrowser 子命令。
 * 这些命令在桌面端有用但 Web 环境下无效或危险。
 */
const BLOCKED_XBROWSER_COMMANDS = new Set([
	'open', // 桌面端打开文件/程序
	'record', // 录制操作（需要桌面端 UI）
	'replay', // 重放录制（同上）
	'convert', // 录制转换（同上）
	'extract', // 录制提取（同上）
]);

/** 检查命令是否被禁止，返回 null 表示允许，否则返回拒绝信息 */
function checkBlockedCommand(args: string[]): string | null {
	if (args.length === 0) return null;
	const cmd = args[0]!.toLowerCase();
	if (BLOCKED_XBROWSER_COMMANDS.has(cmd)) {
		return `🚫 命令 "${cmd}" 在 Web 模式下不可用。该命令仅在桌面端支持。`;
	}
	return null;
}

// ===== xbrowser 版本检测 =====

async function detectXbrowser(): Promise<{ available: boolean; version: string | null }> {
	try {
		const { execFileSync } = await import('child_process');
		const out = execFileSync('/usr/local/bin/xbrowser', ['--version'], {
			timeout: 5000,
			encoding: 'utf8',
			env: { ...process.env, NODE_OPTIONS: '' },
		}).trim();
		const m = out.match(/v?(\d+\.\d+\.\d+)/);
		return { available: true, version: m ? (m[1] ?? null) : null };
	} catch {
		return { available: false, version: null };
	}
}

async function getSystemInfo(force = false): Promise<unknown> {
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
	const data = { xbrowser, browser, serverVersion: '0.4.0' };
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

	r('browser.getSystemInfo', async () => {
		return await getSystemInfo();
	});

	r('browser.checkConnection', async (params) => {
		const browser = await getOnlineBrowser(params.pluginId);
		return {
			connected: !!browser,
			browserCount: browser ? 1 : 0,
			browsers: browser ? [browser] : [],
		};
	});

	r('browser.getConnectionGuide', async () => {
		const browser = await getOnlineBrowser();
		return {
			// 用户视角：只有"浏览器是否已连接"
			connected: !!browser,
			tabs: browser?.tabs ?? 0,
		};
	});

	r('browser.listTabs', async () => {
		try {
			const result = await execXbrowser(['tab', 'list']);
			const tabs = result?.data?.tabs || [];
			return {
				total: tabs.length,
				activeIndex: result?.data?.activeIndex ?? 0,
				tabs: tabs.map((t: Record<string, unknown>) => ({
					index: t.index,
					url: t.url,
					title: t.title,
					active: t.active,
				})),
			};
		} catch (e: unknown) {
			log.error('listTabs failed', { error: e instanceof Error ? e.message : String(e) });
			return { total: 0, activeIndex: 0, tabs: [] };
		}
	});

	r('browser.listPlugins', async () => {
		if (_pluginsCache && Date.now() - _pluginsCacheTime < 5 * 60 * 1000) {
			return { plugins: _pluginsCache };
		}
		try {
			const { execFileSync } = await import('child_process');
			const { tmpdir } = await import('os');
			const { join } = await import('path');
			const { unlinkSync, existsSync, readFileSync } = await import('fs');
			const tmpFile = join(tmpdir(), `xb-plugins-${Date.now()}.json`);
			execFileSync(
				'sh',
				['-c', `'/usr/local/bin/xbrowser' plugin list --json > '${tmpFile}' 2>/dev/null`],
				{
					timeout: 30000,
					env: { ...process.env, NODE_OPTIONS: '' },
				},
			);
			let plugins: unknown[] = [];
			if (existsSync(tmpFile)) {
				const raw = readFileSync(tmpFile, 'utf8').trim();
				try {
					const data = JSON.parse(raw);
					const rawList = Array.isArray(data) ? data : data?.plugins || [];
					plugins = rawList.map((p: Record<string, unknown>) => ({
						name: p.name || p.id || p,
						description: p.description || p.metadata?.description || '',
					}));
				} catch {}
				try {
					unlinkSync(tmpFile);
				} catch {}
			}
			_pluginsCache = plugins;
			_pluginsCacheTime = Date.now();
			return { plugins };
		} catch (e: unknown) {
			log.error('listPlugins failed', { error: e instanceof Error ? e.message : String(e) });
			return { plugins: [] };
		}
	});

	r('browser.execXbrowser', async (params) => {
		try {
			// 把命令字符串拆分为参数数组（支持引号包裹的 URL 等）
			const args = parseCommandString(params.command);

			// Web 模式命令拦截
			const blocked = checkBlockedCommand(args);
			if (blocked) {
				return { success: false, data: { error: blocked, blocked: true } };
			}

			// 如果指定了 tabIndex，自动注入 --tab 参数
			if (params.tabIndex !== undefined && params.tabIndex >= 0) {
				// 避免重复添加 --tab
				if (!args.some((a) => a === '--tab' || a === '-t')) {
					args.push('--tab', String(params.tabIndex));
				}
			}

			const result = await execXbrowser(args);
			return { success: !!result?.success, data: result?.data };
		} catch (e: unknown) {
			return { success: false, data: { error: e instanceof Error ? e.message : String(e) } };
		}
	});

	r('browser.agentChat', async (params) => {
		const { message, sessionId, activePlugins } = params;
		log.info('agentChat received', {
			message: message.slice(0, 50),
			sessionId,
			hasPlugins: !!activePlugins,
		});
		if (!message || !sessionId) {
			return { messageId: '', text: '缺少必要参数', steps: [] };
		}

		const messageId = `msg_${Date.now().toString(36)}`;

		// 发送 Agent 开始事件
		server.emitEvent('browser.agentStart', {
			messageId,
			reply: '🤔 思考中...',
		});

		// ── Mock 流式模式：跳过真实 Agent，用脚本化演示 ──────────
		if (config.enableMockStream) {
			log.info('agentChat running in MOCK mode (ENABLE_MOCK_STREAM=true)');
			const mockResult = await runMockAgentChat(message, messageId, (event, payload) => {
				server.emitEvent(event as never, payload);
			});
			return { messageId, text: mockResult.text, steps: mockResult.steps };
		}

		// 检查浏览器连接
		const browser = await getOnlineBrowser();
		if (!browser) {
			server.emitEvent('browser.done', {
				messageId,
				reply: '⚠️ 没有检测到在线浏览器，请先安装并加载 Chrome 扩展。',
				steps: [],
			});
			return {
				messageId,
				text: '⚠️ 没有检测到在线浏览器',
				steps: [],
			};
		}

		// 调用 Agent
		const liveToolCalls: {
			id: string;
			tool: string;
			input: string;
			output: string;
			status: string;
		}[] = [];
		const agentResult = await agentChat(
			message,
			sessionId,
			(event) => {
				if (event.type === 'tool_call') {
					const tcId = event.toolCallId || `tc_${liveToolCalls.length}`;
					liveToolCalls.push({
						id: tcId,
						tool: event.toolName,
						input: event.toolInput || '',
						output: '',
						status: 'running',
					});
					server.emitEvent('browser.toolCall', {
						messageId,
						toolCall: {
							id: tcId,
							tool: event.toolName || '',
							input: event.toolInput || '',
							status: 'running',
						},
					});
				}
				if (event.type === 'tool_result') {
					const last = liveToolCalls[liveToolCalls.length - 1];
					const tcId = event.toolCallId || last?.id;
					if (last) {
						last.output = event.toolOutput || '';
						last.status = 'done';
					}
					server.emitEvent('browser.toolResult', {
						messageId,
						toolCallId: tcId,
						output: event.toolOutput || '',
					});
				}
				if (event.type === 'thinking' && event.text) {
					server.emitEvent('browser.thinking', {
						messageId,
						delta: event.text,
					});
				}
				if (event.type === 'turn' && event.turn) {
					server.emitEvent('browser.turn', {
						messageId,
						turn: event.turn,
						maxTurns: Number(process.env.AGENT_MAX_TURNS || 30),
					});
				}
				if (event.type === 'text' && event.text) {
					server.emitEvent('browser.textDelta', {
						messageId,
						delta: event.text,
					});
				}
			},
			activePlugins,
		);

		const steps = liveToolCalls.map((tc) => ({
			label: tc.tool,
			status: 'done' as const,
			detail: tc.input.slice(0, 80),
		}));

		// 触发采集
		let finalText = agentResult.text;
		if (agentResult.usedScrape) {
			const urlMatch = message.match(/https?:\/\/[^\s,，""''）)]+/);
			const targetUrl = urlMatch?.[0] || 'https://www.xiaohongshu.com/explore';

			const scrapeResult = await scrapeXhs(
				'',
				sessionId,
				messageId,
				'',
				(scrapeSteps) => {
					const allSteps = [...steps, ...scrapeSteps];
					server.emitEvent('browser.progress', {
						messageId,
						steps: allSteps,
					});
				},
				{ url: targetUrl },
			);

			finalText = agentResult.text + `\n\n✅ 采集完成: ${scrapeResult.notes.length} 条笔记`;
		}

		// 发送完成事件
		const allSteps = steps;
		server.emitEvent('browser.done', {
			messageId,
			reply: finalText,
			steps: allSteps,
		});

		return { messageId, text: finalText, steps: allSteps };
	});
}
