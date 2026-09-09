/**
 * Mock 流式引擎 — 模拟真实 Agent 的多步骤流式输出
 *
 * 当 ENABLE_MOCK_STREAM=true 时，browser.agentChat 不连接真实 AI 进程，
 * 而是走这里。脚本化地按真实流程顺序 emit 事件：
 *
 *   agentStart → thinking → turn → toolCall → toolResult → textDelta(逐字) → done
 *
 * 这样无需 AI 进程即可验证流式渲染效果和演示产品。
 *
 * 事件 payload 结构与 BrowserEvents 接口严格一致（见 modules/browser.ts）。
 */

/** emit 回调签名 — 和真实 handler 里的 emitEvent 调用一一对应 */
export type MockEmit = (event: string, payload: Record<string, unknown>) => void;

/** 单条文本按 chunk 切分并逐块 emit（模拟 token 流） */
async function streamText(
	text: string,
	messageId: string,
	emit: MockEmit,
	chunkSize = 3,
	delayMs = 30,
): Promise<void> {
	for (let i = 0; i < text.length; i += chunkSize) {
		const chunk = text.slice(i, i + chunkSize);
		emit('browser.textDelta', { messageId, delta: chunk });
		await sleep(delayMs);
	}
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 运行一次完整的 mock agent 对话流程。
 *
 * @param message  用户输入（用于生成贴合的回复）
 * @param messageId 后端分配的消息 ID
 * @param emit     事件发射回调
 * @returns 最终文本 + 步骤列表（与真实 agentChat 返回值结构一致）
 */
export async function runMockAgentChat(
	message: string,
	messageId: string,
	emit: MockEmit,
): Promise<{ text: string; steps: { label: string; status: string; detail?: string }[] }> {
	const steps: { label: string; status: string; detail?: string }[] = [];

	// ── 1. Agent 开始 ──────────────────────────────────────────
	emit('browser.agentStart', { messageId, reply: '🤔 思考中...' });
	await sleep(400);

	// ── 2. 思考增量 ────────────────────────────────────────────
	const thinkingChunks = [
		'用户想要',
		`「${message.slice(0, 20)}」`,
		'。\n我需要先打开浏览器，',
		'然后执行采集操作。',
	];
	for (const chunk of thinkingChunks) {
		emit('browser.thinking', { messageId, delta: chunk });
		await sleep(80);
	}
	await sleep(300);

	// ── 3. 轮次 1 开始 ─────────────────────────────────────────
	emit('browser.turn', { messageId, turn: 1, maxTurns: 3 });
	await sleep(200);

	// ── 4. 工具调用：navigate ──────────────────────────────────
	const tcId = `tc_mock_${Date.now().toString(36)}`;
	emit('browser.toolCall', {
		messageId,
		toolCall: {
			id: tcId,
			tool: 'navigate',
			input: '{"url":"https://www.xiaohongshu.com/explore"}',
			status: 'running',
		},
	});
	await sleep(600);

	// 工具结果
	emit('browser.toolResult', {
		messageId,
		toolCallId: tcId,
		output: '{"success":true,"title":"小红书 - 标记我的生活","tabs":1}',
	});
	steps.push({
		label: 'navigate',
		status: 'done',
		detail: '{"url":"https://www.xiaohongshu.com/explore"}',
	});
	await sleep(300);

	// ── 5. 第一段文本（逐 token 流）────────────────────────────
	await streamText('好的，我已经打开了小红书。现在我来帮你采集页面上的笔记内容。', messageId, emit);
	await sleep(400);

	// ── 6. 轮次 2：采集工具 ────────────────────────────────────
	emit('browser.turn', { messageId, turn: 2, maxTurns: 3 });
	await sleep(200);

	const tcId2 = `tc_mock2_${Date.now().toString(36)}`;
	emit('browser.toolCall', {
		messageId,
		toolCall: {
			id: tcId2,
			tool: 'scrape',
			input: '{"selector":".note-item","fields":["title","author","likes"]}',
			status: 'running',
		},
	});
	await sleep(800);

	emit('browser.toolResult', {
		messageId,
		toolCallId: tcId2,
		output: '{"success":true,"count":12,"items":[...]}',
	});
	steps.push({
		label: 'scrape',
		status: 'done',
		detail: '采集到 12 条笔记',
	});
	await sleep(300);

	// ── 7. 采集进度 ────────────────────────────────────────────
	emit('browser.progress', {
		messageId,
		steps: [...steps, { label: 'export', status: 'running', detail: '导出 CSV...' }],
	});
	await sleep(500);

	// ── 8. 总结文本（逐 token 流）──────────────────────────────
	const finalText = `采集完成！✅\n\n共获取到 **12 条笔记**，包含标题、作者、点赞数等字段。\n\n你可以点击右侧「资产面板」查看完整数据，或导出为 CSV / JSON / Markdown 格式。`;
	await streamText(finalText, messageId, emit, 4, 25);

	// ── 9. 完成 ────────────────────────────────────────────────
	emit('browser.done', {
		messageId,
		reply: finalText,
		steps: [...steps, { label: 'export', status: 'done', detail: '已导出 CSV (12 行)' }],
	});

	return { text: finalText, steps };
}
