/**
 * Command Bar — 直接执行 xbrowser 命令（不经 Agent）
 *
 * 用户可以输入 scrape/crawl/map/goto/title 等命令，直接调用
 * browser.execXbrowser 执行。选中了标签页时自动注入 --tab 参数。
 */

import { useState, useRef } from "react";
import { Terminal, Play, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { apiClient } from "../../lib/api-client";
import { useConnectionStore } from "../../stores/use-connection-store";
import { networkBus } from "../../lib/network-bus";

const QUICK_COMMANDS = [
	{ label: "title", cmd: "title", desc: "页面标题" },
	{ label: "url", cmd: "url", desc: "当前 URL" },
	{ label: "screenshot", cmd: "screenshot", desc: "截图" },
	{ label: "scrape", cmd: "scrape", desc: "采集页面" },
	{ label: "map", cmd: "map", desc: "网站结构" },
	{ label: "tab list", cmd: "tab list", desc: "标签页列表" },
];

interface CommandResult {
	success: boolean;
	data: unknown;
	raw: string;
	elapsed: number;
}

export function CommandBar() {
	const [input, setInput] = useState("");
	const [running, setRunning] = useState(false);
	const [result, setResult] = useState<CommandResult | null>(null);
	const [showResult, setShowResult] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const browserStatus = useConnectionStore((s) => s.browserStatus);
	const selectedTabIndex = useConnectionStore((s) => s.selectedTabIndex);
	const activeTabIndex = useConnectionStore((s) => s.activeTabIndex);

	const isOnline = browserStatus === "online";
	const effectiveTab = selectedTabIndex ?? activeTabIndex;

	const execute = async (command: string): Promise<void> => {
		const cmd = command.trim();
		if (!cmd || running) return;

		setRunning(true);
		setShowResult(true);
		setResult(null);
		networkBus.emitRequest("browser.execXbrowser", { command: cmd, tabIndex: effectiveTab });

		const t0 = performance.now();
		try {
			const res = await apiClient.call("browser.execXbrowser", {
				command: cmd,
				tabIndex: selectedTabIndex ?? undefined,
			});
			const elapsed = Math.round(performance.now() - t0);

			const resultData = res.data;
			const raw = JSON.stringify(resultData, null, 2);
			setResult({
				success: res.success,
				data: resultData,
				raw,
				elapsed,
			});
			networkBus.emitResponse("browser.execXbrowser", elapsed);
		} catch (err) {
			const elapsed = Math.round(performance.now() - t0);
			const errMsg = err instanceof Error ? err.message : String(err);
			setResult({
				success: false,
				data: { error: errMsg },
				raw: errMsg,
				elapsed,
			});
			networkBus.emitResponse("browser.execXbrowser", elapsed);
		} finally {
			setRunning(false);
		}
	};

	const handleSubmit = (e: React.FormEvent): void => {
		e.preventDefault();
		execute(input);
	};

	const handleQuickCmd = (cmd: string): void => {
		setInput(cmd);
		execute(cmd);
	};

	return (
		<div className="border-b border-[var(--color-border-primary)] bg-[var(--color-bg-tertiary)]">
			{/* 命令输入行 */}
			<form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-2">
				<Terminal className="w-4 h-4 text-[var(--color-text-accent)] flex-shrink-0" />
				<span className="text-[var(--color-text-tertiary)] text-xs font-mono flex-shrink-0">
					xbrowser&gt;
				</span>
				<input
					ref={inputRef}
					type="text"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					placeholder={
						isOnline
							? `输入命令，如: scrape https://example.com${
									selectedTabIndex !== null ? ` (作用于 #${selectedTabIndex})` : ""
								}`
							: "浏览器未连接，先连接 Chrome"
					}
					disabled={!isOnline || running}
					className="flex-1 px-2 py-1.5 text-xs font-mono bg-[var(--color-bg-secondary)] rounded text-[var(--color-text-primary)] border border-[var(--color-border-secondary)] focus:border-[var(--color-accent)] focus:outline-none disabled:opacity-50"
				/>
				{selectedTabIndex !== null && (
					<span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-accent)]/20 text-[var(--color-text-accent)] flex-shrink-0">
						--tab {selectedTabIndex}
					</span>
				)}
				<button
					type="submit"
					disabled={!isOnline || running || !input.trim()}
					className="px-3 py-1.5 text-xs bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded transition-colors disabled:opacity-50 flex items-center gap-1 flex-shrink-0"
				>
					{running ? (
						<Loader2 className="w-3 h-3 animate-spin" />
					) : (
						<Play className="w-3 h-3" />
					)}
					执行
				</button>
			</form>

			{/* 快捷命令 */}
			<div className="flex gap-1 px-4 pb-2 flex-wrap">
				{QUICK_COMMANDS.map((qc) => (
					<button
						key={qc.label}
						onClick={() => handleQuickCmd(qc.cmd)}
						disabled={!isOnline || running}
						title={qc.desc}
						className="px-2 py-0.5 text-[10px] font-mono bg-[var(--color-bg-secondary)] border border-[var(--color-border-secondary)] rounded hover:border-[var(--color-accent)] hover:text-[var(--color-text-accent)] transition-colors disabled:opacity-50"
					>
						{qc.label}
					</button>
				))}
			</div>

			{/* 结果展示 */}
			{showResult && result && (
				<div className="px-4 pb-2">
					<div className="rounded border border-[var(--color-border-secondary)] bg-[var(--color-bg-sidebar)] overflow-hidden">
						{/* 结果头部 */}
						<div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--color-border-secondary)] bg-[var(--color-bg-secondary)]">
							<div className="flex items-center gap-2 text-xs">
								{result.success ? (
									<CheckCircle className="w-3 h-3 text-[var(--color-text-success)]" />
								) : (
									<AlertCircle className="w-3 h-3 text-[var(--color-text-error)]" />
								)}
								<span className={result.success ? "text-[var(--color-text-success)]" : "text-[var(--color-text-error)]"}>
									{result.success ? "成功" : "失败"} · {result.elapsed}ms
								</span>
							</div>
							<button
								onClick={() => setShowResult(false)}
								className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] text-xs"
							>
								关闭
							</button>
						</div>
						{/* 结果内容 */}
						<pre className="px-3 py-2 text-xs font-mono overflow-auto max-h-48 text-[var(--color-text-secondary)]">
							{result.raw}
						</pre>
					</div>
				</div>
			)}
		</div>
	);
}
