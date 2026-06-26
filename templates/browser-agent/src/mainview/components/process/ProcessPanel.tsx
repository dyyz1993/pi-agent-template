/**
 * ProcessPanel — 加工面板（录制结果 + Agent 加工）
 *
 * 展示录制摘要、操作时间线，触发 Agent 加工分析。
 * 独立于会话，不混入聊天列表。
 */

import { useState, useCallback } from "react";
import {
	Cpu,
	Clock,
	MousePointerClick,
	Network,
	FileText,
	Loader2,
	CheckCircle2,
} from "lucide-react";
import { useRecordStore } from "../../stores/use-record-store";
import { useSessionStore } from "../../stores/use-session-store";
import { apiClient } from "../../lib/api-client";

const ACTION_ICONS: Record<string, string> = {
	click: "👆",
	input: "⌨️",
	change: "📝",
	keydown: "🔑",
	submit: "✅",
	scroll: "⬇️",
	navigation: "🧭",
	goto: "🧭",
	dblclick: "👆👆",
	contextmenu: "🖱️",
	hover: "💡",
	drag: "🎯",
};

export function ProcessPanel() {
	const lastRecording = useRecordStore((s) => s.lastRecording);
	const ensureDefaultSession = useSessionStore((s) => s.ensureDefaultSession);

	const [processing, setProcessing] = useState(false);
	const [result, setResult] = useState<string | null>(null);
	const [thinking, setThinking] = useState("");

	const handleProcess = useCallback(async () => {
		if (!lastRecording) return;
		setProcessing(true);
		setResult(null);
		setThinking("");

		try {
			const sessionId = await ensureDefaultSession();
			const messageId = `proc_${Date.now()}`;

			// 订阅加工事件
			const subs: string[] = [];
			subs.push(
				await apiClient.subscribe("browser.thinking", (evt: any) => {
					if (evt.messageId === messageId) {
						setThinking((prev) => prev + (evt.delta || ""));
					}
				}),
			);
			subs.push(
				await apiClient.subscribe("browser.textDelta", (evt: any) => {
					if (evt.messageId === messageId) {
						setResult((prev) => (prev || "") + (evt.delta || ""));
					}
				}),
			);
			subs.push(
				await apiClient.subscribe("browser.done", (evt: any) => {
					if (evt.messageId === messageId) {
						setResult(evt.reply || "");
						setProcessing(false);
					}
				}),
			);

			await new Promise((r) => setTimeout(r, 300));

			const res = await apiClient.call("browser.processRecording", {
				sessionId,
				recordingData: lastRecording.data,
				title: "录制加工",
			});

			// Fallback: 用 RPC 响应填充
			if (!result && res?.text) {
				setResult(res.text);
			}
			setProcessing(false);

			subs.forEach((id) => apiClient.unsubscribe(id));
		} catch (err) {
			setResult(`❌ 加工失败: ${err instanceof Error ? err.message : String(err)}`);
			setProcessing(false);
		}
	}, [lastRecording, ensureDefaultSession, result]);

	// 无录制数据时的空状态
	if (!lastRecording) {
		return (
			<div className="flex-1 flex items-center justify-center text-center p-8">
				<div>
					<div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--color-bg-tertiary)] mb-4">
						<Cpu className="w-8 h-8 text-[var(--color-text-tertiary)]" />
					</div>
					<h3 className="text-lg font-semibold mb-2">暂无录制数据</h3>
					<p className="text-sm text-[var(--color-text-tertiary)] max-w-sm">
						点击顶栏的 <Circle /> 录制按钮，在浏览器中操作后停止录制，
						录制结果会显示在这里，可以交给 Agent 加工分析。
					</p>
				</div>
			</div>
		);
	}

	const durationSec = Math.round(lastRecording.durationMs / 1000);
	const actions = lastRecording.data?.actions || [];
	const networks = lastRecording.data?.network || [];

	return (
		<div className="flex-1 overflow-auto p-4">
			{/* 录制摘要卡片 */}
			<div className="bg-[var(--color-bg-sidebar)] border border-[var(--color-border-primary)] rounded-xl p-4 mb-4">
				<div className="flex items-center justify-between mb-3">
					<h3 className="text-sm font-semibold flex items-center gap-2">
						<CheckCircle2 className="w-4 h-4 text-[var(--color-text-success)]" />
						录制完成
					</h3>
					<button
						onClick={handleProcess}
						disabled={processing}
						className="px-4 py-1.5 text-xs bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
					>
						{processing ? (
							<Loader2 className="w-3 h-3 animate-spin" />
						) : (
							<Cpu className="w-3 h-3" />
						)}
						{processing ? "加工中..." : "Agent 加工"}
					</button>
				</div>
				<div className="grid grid-cols-4 gap-3 text-center">
					<div className="p-2 bg-[var(--color-bg-tertiary)] rounded-lg">
						<MousePointerClick className="w-4 h-4 text-[var(--color-text-accent)] mx-auto mb-1" />
						<div className="text-lg font-bold">{lastRecording.actions}</div>
						<div className="text-[10px] text-[var(--color-text-tertiary)]">操作数</div>
					</div>
					<div className="p-2 bg-[var(--color-bg-tertiary)] rounded-lg">
						<Network className="w-4 h-4 text-[var(--color-text-accent)] mx-auto mb-1" />
						<div className="text-lg font-bold">{lastRecording.network}</div>
						<div className="text-[10px] text-[var(--color-text-tertiary)]">网络请求</div>
					</div>
					<div className="p-2 bg-[var(--color-bg-tertiary)] rounded-lg">
						<Clock className="w-4 h-4 text-[var(--color-text-accent)] mx-auto mb-1" />
						<div className="text-lg font-bold">{durationSec}s</div>
						<div className="text-[10px] text-[var(--color-text-tertiary)]">耗时</div>
					</div>
					<div className="p-2 bg-[var(--color-bg-tertiary)] rounded-lg">
						<FileText className="w-4 h-4 text-[var(--color-text-accent)] mx-auto mb-1" />
						<div className="text-lg font-bold">{lastRecording.steps}</div>
						<div className="text-[10px] text-[var(--color-text-tertiary)]">步骤</div>
					</div>
				</div>
			</div>

			{/* 操作时间线 */}
			{actions.length > 0 && (
				<div className="bg-[var(--color-bg-sidebar)] border border-[var(--color-border-primary)] rounded-xl p-4 mb-4">
					<h4 className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide mb-3">
						操作时间线 ({actions.length})
					</h4>
					<div className="space-y-1 max-h-64 overflow-auto">
						{actions.slice(0, 50).map((action: any, i: number) => {
							const type = action.type || action.action?.type || "unknown";
							const selector = action.element?.selector || action.action?.element?.selector || "";
							const value = action.value || action.action?.value || "";
							const icon = ACTION_ICONS[type] || "•";
							return (
								<div key={i} className="flex items-center gap-2 px-2 py-1 text-xs hover:bg-[var(--color-bg-hover)] rounded">
									<span className="flex-shrink-0 w-6 text-center">{icon}</span>
									<span className="text-[var(--color-text-tertiary)] flex-shrink-0">#{i + 1}</span>
									<span className="font-mono text-[var(--color-text-accent)] flex-shrink-0">{type}</span>
									<span className="text-[var(--color-text-secondary)] truncate">
										{selector && <span className="text-[var(--color-text-tertiary)]">{selector.slice(0, 60)}</span>}
										{value && <span className="ml-1">= "{value.slice(0, 30)}"</span>}
									</span>
								</div>
							);
						})}
						{actions.length > 50 && (
							<div className="text-center text-xs text-[var(--color-text-tertiary)] py-1">
								... 还有 {actions.length - 50} 条操作
							</div>
						)}
					</div>
				</div>
				)}

				{/* 网络请求时间线（actions 为空时展示） */}
				{actions.length === 0 && networks.length > 0 && (
					<div className="bg-[var(--color-bg-sidebar)] border border-[var(--color-border-primary)] rounded-xl p-4 mb-4">
						<h4 className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide mb-3">
							🌐 网络请求时间线 ({networks.length})
						</h4>
						<div className="space-y-1 max-h-64 overflow-auto">
							{networks.slice(0, 30).map((n: any, i: number) => {
								const seenPaths = new Set<string>();
								const key = `${n.method || 'GET'} ${n.path || n.url}`;
								if (seenPaths.has(key)) return null;
								seenPaths.add(key);
								const isApi = n.resourceType === 'XHR' || n.resourceType === 'Fetch';
								return (
									<div key={i} className="flex items-center gap-2 px-2 py-1 text-xs hover:bg-[var(--color-bg-hover)] rounded">
										<span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono ${isApi ? 'bg-[var(--color-accent)]/15 text-[var(--color-text-accent)]' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]'}`}>
											{n.method || 'GET'}
										</span>
										<span className="text-[var(--color-text-secondary)] truncate flex-1">
											{n.path || n.url}
										</span>
										<span className="flex-shrink-0 text-[var(--color-text-tertiary)]">
											{n.status || '—'}
										</span>
									</div>
								);
							})}
							{networks.length > 30 && (
								<div className="text-center text-xs text-[var(--color-text-tertiary)] py-1">
									... 还有 {networks.length - 30} 个请求
								</div>
							)}
						</div>
					</div>
				)}

				{/* Agent 思考过程 */}
			{thinking && (
				<details className="mb-4 text-xs text-[var(--color-text-tertiary)]" open>
					<summary className="cursor-pointer mb-1 font-medium">💭 Agent 思考中...</summary>
					<div className="p-2 bg-[var(--color-bg-tertiary)] rounded-lg whitespace-pre-wrap max-h-40 overflow-auto">
						{thinking.slice(-1000)}
					</div>
				</details>
			)}

			{/* 加工结果 */}
			{result && (
				<div className="bg-[var(--color-bg-sidebar)] border border-[var(--color-accent)]/30 rounded-xl p-4">
					<h4 className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide mb-2">
						加工结果
					</h4>
					<div className="text-sm leading-relaxed whitespace-pre-wrap">
						{result}
					</div>
				</div>
			)}

			{processing && !result && !thinking && (
				<div className="text-center py-8 text-sm text-[var(--color-text-tertiary)]">
					<Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
					Agent 正在分析录制数据...
				</div>
			)}
		</div>
	);
}

function Circle() {
	return <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 align-middle" />;
}
