/**
 * 消息气泡 — 用户消息右对齐，Agent 消息左对齐含轮次/工具/步骤
 *
 * 对应 PRD §4.3 流式渲染 + §5.2 消息气泡
 */

import type { AgentMessage, ToolCall, Turn } from "../../stores/use-chat-store";

// ===== 工具元数据 =====
const TOOL_META: Record<string, { icon: string; label: string }> = {
	xbrowser: { icon: "🌐", label: "xbrowser" },
	web_search: { icon: "🔎", label: "搜索" },
	fetch_content: { icon: "📄", label: "抓取" },
	bash: { icon: "⚡", label: "命令" },
	todo: { icon: "📝", label: "规划" },
};

function describeCommand(input: string): string {
	try {
		const parsed = JSON.parse(input);
		const cmd = parsed.command || "";
		const firstWord = cmd.split(/\s+/)[0];
		const cmdMeta: Record<string, string> = {
			goto: "🧭 打开",
			open: "🧭 打开",
			scrape: "📡 采集",
			crawl: "🕷️ 爬取",
			screenshot: "📸 截图",
			eval: "⚙️ 执行JS",
			click: "👆 点击",
			fill: "⌨️ 输入",
			scroll: "⬇️ 滚动",
			tab: "📋 标签页",
			search: "🔍 搜索",
		};
		return cmdMeta[firstWord] || firstWord;
	} catch {
		return "";
	}
}

function ToolCallCard({ call }: { call: ToolCall }) {
	const meta = TOOL_META[call.tool] || { icon: "🔧", label: call.tool };
	const isRunning = call.status === "running";

	let displayLabel = meta.label;
	let displayInput = call.input;
	if (call.tool === "xbrowser") {
		const desc = describeCommand(call.input);
		if (desc) displayLabel = desc;
		try {
			displayInput = JSON.parse(call.input).command || "";
		} catch {}
	}

	return (
		<div
			className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg mb-1 text-sm ${
				isRunning ? "bg-[var(--color-bg-active)]" : "bg-[var(--color-bg-tertiary)]"
			}`}
		>
			<span>{meta.icon}</span>
			<span className="font-medium">{displayLabel}</span>
			<span className="text-[var(--color-text-tertiary)] text-xs">
				{call.tool}
			</span>
			{displayInput && (
				<span className="text-[var(--color-text-tertiary)] text-xs flex-1 truncate">
					{displayInput.slice(0, 80)}
				</span>
			)}
			<span className="ml-auto">{isRunning ? "⏳" : "✓"}</span>
		</div>
	);
}

function TurnBlock({ turn }: { turn: Turn }) {
	const isRunning = !turn.done;
	const toolCount = (turn.toolCalls || []).length;
	const hasText = !!(turn.text && turn.text.trim());

	return (
		<details
			open={isRunning}
			className="mb-2 rounded-lg border border-[var(--color-border-primary)] overflow-hidden"
		>
			<summary
				className={`px-2.5 py-1.5 cursor-pointer text-xs font-medium flex items-center gap-1.5 ${
					isRunning
						? "bg-[var(--color-bg-active)]"
						: "bg-[var(--color-bg-secondary)]"
				}`}
			>
				<span>{isRunning ? "⚡" : "✓"}</span>
				<span>第 {turn.turn} 轮</span>
				{toolCount > 0 && (
					<span className="text-[var(--color-text-tertiary)]">
						· {toolCount} 个操作
					</span>
				)}
				{hasText && (
					<span className="text-[var(--color-text-tertiary)] ml-auto truncate max-w-[200px]">
						{turn.text.slice(0, 40)}
					</span>
				)}
			</summary>
			<div className="p-2.5">
				{turn.toolCalls.map((tc) => (
					<ToolCallCard key={tc.id} call={tc} />
				))}
				{hasText && (
					<div className="mt-1 text-sm whitespace-pre-wrap">
						{turn.text}
					</div>
				)}
			</div>
		</details>
	);
}

function stepIcon(status: string): string {
	switch (status) {
		case "done":
			return "✅";
		case "running":
			return "⏳";
		case "error":
			return "❌";
		default:
			return "⏸️";
	}
}

export function MessageBubble({
	message,
}: {
	message: AgentMessage | { id: string; role: "user"; text: string; at: number };
}) {
	if (message.role === "user") {
		return (
			<div className="flex justify-end mb-4">
				<div
					className="max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
					style={{
						background: "linear-gradient(135deg, #8b5cf6, #3b82f6)",
						color: "#fff",
					}}
				>
					{message.text}
				</div>
			</div>
		);
	}

	const m = message as AgentMessage;

	return (
		<div className="mb-4">
			<div className="flex items-center gap-2 mb-2">
				<span
					className="w-7 h-7 rounded-full flex items-center justify-center text-sm text-white"
					style={{ background: "var(--color-accent)" }}
				>
					◈
				</span>
				<span className="font-semibold text-sm">Agent</span>
			</div>

			{/* 思考过程（默认折叠） */}
			{m.thinking && (
				<details className="mb-2 text-xs text-[var(--color-text-tertiary)]">
					<summary className="cursor-pointer mb-1">💭 思考过程</summary>
					<div className="p-2 bg-[var(--color-bg-tertiary)] rounded-lg whitespace-pre-wrap text-xs leading-relaxed">
						{m.thinking.slice(-800)}
					</div>
				</details>
			)}

			{/* 轮次展示 */}
			{m.turns?.map((turn) => (
				<TurnBlock key={turn.turn} turn={turn} />
			))}

			{/* 步骤清单 */}
			{m.steps && m.steps.length > 0 && (
				<div className="mb-2 p-2 bg-[var(--color-bg-tertiary)] rounded-lg text-xs">
					{m.steps.map((step, i) => (
						<div key={i} className="flex items-center gap-1.5 py-0.5">
							<span>{stepIcon(step.status)}</span>
							<span>{step.label}</span>
							{step.detail && (
								<span className="text-[var(--color-text-tertiary)]">
									{step.detail}
								</span>
							)}
						</div>
					))}
				</div>
			)}

			{/* 摘要卡 */}
			{m.summary && (
				<div className="mb-2 p-3 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]">
					<div className="font-semibold text-sm mb-2">✅ 采集完成摘要</div>
					<div className="grid grid-cols-2 gap-2 text-xs">
						<div>
							<div className="text-lg font-bold">{m.summary.noteCount}</div>
							<div className="text-[var(--color-text-tertiary)]">笔记</div>
						</div>
						<div>
							<div className="text-lg font-bold">{m.summary.imageCount}</div>
							<div className="text-[var(--color-text-tertiary)]">图片</div>
						</div>
						<div>
							<div className="text-lg font-bold">{m.summary.successRate}</div>
							<div className="text-[var(--color-text-tertiary)]">成功率</div>
						</div>
						<div>
							<div className="text-lg font-bold">
								{fmtDuration(m.summary.durationMs)}
							</div>
							<div className="text-[var(--color-text-tertiary)]">耗时</div>
						</div>
					</div>
				</div>
			)}

			{/* 最终文本 */}
			{m.text && (
				<div className="text-sm leading-relaxed whitespace-pre-wrap">
					{m.text}
				</div>
			)}

			{/* 错误 */}
			{m.error && (
				<div className="p-2 rounded-lg text-sm bg-red-500/10 text-[var(--color-text-error)]">
					❌ {m.error}
				</div>
			)}
		</div>
	);
}

function fmtDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	if (ms < 60000) return `${Math.round(ms / 1000)}s`;
	return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}
