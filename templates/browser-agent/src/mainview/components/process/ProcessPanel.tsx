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
	Camera,
	ChevronDown,
	ChevronRight,
} from "lucide-react";
import { useRecordStore } from "../../stores/use-record-store";
import { useSessionStore } from "../../stores/use-session-store";
import { useConnectionStore } from "../../stores/use-connection-store";
import { apiClient } from "../../lib/api-client";

const ACTION_ICONS: Record<string, string> = {
	click: "👆", input: "⌨️", change: "📝", keydown: "🔑",
	submit: "✅", scroll: "⬇️", navigation: "🧭", goto: "🧭",
	dblclick: "👆👆", contextmenu: "🖱️", hover: "💡", drag: "🎯",
};

export function ProcessPanel() {
	// ===== 所有 Hooks 必须在早期 return 之前声明 =====
	const [expandedAction, setExpandedAction] = useState<number | null>(null);
	const [capturing, setCapturing] = useState<number | null>(null);
	const [screenshots, setScreenshots] = useState<Record<number, string>>({});
	const [fullScreenshot, setFullScreenshot] = useState<string | null>(null);
	const [capturingFull, setCapturingFull] = useState(false);

	const captureActionScreenshot = useCallback(async (actionIndex: number) => {
		setCapturing(actionIndex);
		try {
			const tabIdx = useConnectionStore.getState().selectedTabIndex ?? useConnectionStore.getState().activeTabIndex;
			const cmd = `screenshot${tabIdx !== undefined ? ` --tab ${tabIdx}` : ''}`;
			const result = await apiClient.call("browser.execXbrowser", { command: cmd });
			if (result.data?.data) {
				setScreenshots(prev => ({ ...prev, [actionIndex]: result.data.data }));
			}
		} catch (err) {
			console.warn("截图失败:", err);
		} finally {
			setCapturing(null);
		}
	}, []);

	const captureFullScreenshot = useCallback(async () => {
		setCapturingFull(true);
		try {
			const tabIdx = useConnectionStore.getState().selectedTabIndex ?? useConnectionStore.getState().activeTabIndex;
			const cmd = `screenshot --full-page${tabIdx !== undefined ? ` --tab ${tabIdx}` : ''}`;
			const result = await apiClient.call("browser.execXbrowser", { command: cmd });
			if (result.data?.data) {
				setFullScreenshot(result.data.data);
			}
		} catch (err) {
			console.warn("全页截图失败:", err);
		} finally {
			setCapturingFull(false);
		}
	}, []);

	const lastRecording = useRecordStore((s) => s.lastRecording);
	const ensureDefaultSession = useSessionStore((s) => s.ensureDefaultSession);
	const [analyzing, setAnalyzing] = useState(false);
	const [result, setResult] = useState<string | null>(null);
	const [thinking, setThinking] = useState("");

	// ===== 无录制数据时的空状态 =====
	if (!lastRecording) {
		return (
			<div className="flex-1 flex items-center justify-center text-center p-8">
				<div>
					<div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--color-bg-tertiary)] mb-4">
						<Cpu className="w-8 h-8 text-[var(--color-text-tertiary)]" />
					</div>
					<h3 className="text-lg font-semibold mb-2">暂无录制数据</h3>
					<p className="text-sm text-[var(--color-text-tertiary)] max-w-sm">
						点击顶栏的录制按钮，在浏览器中操作后停止录制，
						录制结果会显示在这里，可以交给 Agent 加工分析。
					</p>
				</div>
			</div>
		);
	}

	// ===== 有录制数据 =====
	const durationSec = Math.round(lastRecording.durationMs / 1000);
	const rawActions = lastRecording.data?.actions;
	const rawNetworks = lastRecording.data?.network;
	const actions = Array.isArray(rawActions) ? rawActions : (Array.isArray(lastRecording.data?.data?.actions) ? lastRecording.data.data.actions : []);
	const networks = Array.isArray(rawNetworks) ? rawNetworks : (Array.isArray(lastRecording.data?.data?.network) ? lastRecording.data.data.network : []);

	const handleProcess = useCallback(async () => {
		if (!lastRecording) return;
		setAnalyzing(true);
		setResult(null);
		setThinking("");
		try {
			const sessionId = await ensureDefaultSession();
			const messageId = `proc_${Date.now()}`;
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
						setAnalyzing(false);
					}
				}),
			);
			await new Promise((r) => setTimeout(r, 300));
			const res = await apiClient.call("browser.processRecording", {
				sessionId,
				recordingData: lastRecording.data,
				title: "录制加工",
			});
			if (!result && res?.text) setResult(res.text);
			setAnalyzing(false);
			subs.forEach((id) => apiClient.unsubscribe(id));
		} catch (err) {
			setResult(`❌ 加工失败: ${err instanceof Error ? err.message : String(err)}`);
			setAnalyzing(false);
		}
	}, [lastRecording, ensureDefaultSession, result]);

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
						disabled={analyzing}
						className="px-4 py-1.5 text-xs bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
					>
						{analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Cpu className="w-3 h-3" />}
						{analyzing ? "加工中..." : "Agent 加工"}
					</button>
				</div>
				<div className="grid grid-cols-4 gap-3 text-center">
					<div className="p-2 bg-[var(--color-bg-tertiary)] rounded-lg">
						<MousePointerClick className="w-4 h-4 text-[var(--color-text-accent)] mx-auto mb-1" />
						<div className="text-lg font-bold">{actions.length || lastRecording.actions}</div>
						<div className="text-[10px] text-[var(--color-text-tertiary)]">操作数</div>
					</div>
					<div className="p-2 bg-[var(--color-bg-tertiary)] rounded-lg">
						<Network className="w-4 h-4 text-[var(--color-text-accent)] mx-auto mb-1" />
						<div className="text-lg font-bold">{networks.length || lastRecording.network}</div>
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
					<div className="flex items-center justify-between mb-3">
						<h4 className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide">
							📋 操作时间线 ({actions.length})
						</h4>
						<button
							onClick={captureFullScreenshot}
							disabled={capturingFull}
							className="px-2 py-1 text-[10px] border border-[var(--color-border-secondary)] rounded hover:bg-[var(--color-bg-hover)] flex items-center gap-1"
						>
							<Camera className={`w-3 h-3 ${capturingFull ? "animate-pulse" : ""}`} />
							{capturingFull ? "截取中..." : "📸 全页截图"}
						</button>
					</div>

					{fullScreenshot && (
						<div className="mb-3">
							<img src={`data:image/png;base64,${fullScreenshot}`} alt="页面截图"
								className="w-full rounded-lg border border-[var(--color-border-secondary)] max-h-48 object-cover" />
						</div>
					)}

					<div className="space-y-1 max-h-96 overflow-auto">
						{actions.slice(0, 50).map((action: any, i: number) => {
							const type = action.type || action.action?.type || "unknown";
							const selector = action.element?.selector || action.action?.element?.selector || "";
							const value = action.value || action.action?.value || "";
							const url = action.url || action.action?.url || "";
							const tag = action.element?.tag || action.action?.element?.tag || "";
							const text = action.element?.text || action.action?.element?.text || "";
							const x = action.x || action.action?.x;
							const y = action.y || action.action?.y;
							const ts = action.timestamp || 0;
							const baseTs = actions[0]?.timestamp || ts;
							const elapsed = ts - baseTs;
							const icon = ACTION_ICONS[type] || "•";
							const isExpanded = expandedAction === i;
							const hasScreenshot = screenshots[i];

							return (
								<div key={i}>
									<div
										className={`flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-[var(--color-bg-hover)] rounded cursor-pointer ${isExpanded ? "bg-[var(--color-bg-tertiary)]" : ""}`}
										onClick={() => setExpandedAction(isExpanded ? null : i)}
									>
										<span className="flex-shrink-0 w-5 text-center text-sm">{icon}</span>
										<span className="text-[var(--color-text-tertiary)] font-mono w-6">#{i + 1}</span>
										<span className="font-mono text-[var(--color-text-accent)] w-16">{type}</span>
										{elapsed > 0 && <span className="text-[var(--color-text-tertiary)] font-mono w-12">+{fmt(elapsed)}</span>}
										<span className="text-[var(--color-text-secondary)] truncate flex-1">
											{selector ? selector.slice(0, 50) : tag}
											{value && <span className="ml-1 text-[var(--color-text-tertiary)]">={value.slice(0, 20)}</span>}
										</span>
										{isExpanded ? <ChevronDown className="w-3 h-3 text-[var(--color-text-tertiary)]" /> : <ChevronRight className="w-3 h-3 text-[var(--color-text-tertiary)]" />}
									</div>

									{isExpanded && (
										<div className="ml-8 mb-2 p-3 bg-[var(--color-bg-tertiary)] rounded-lg space-y-2">
											<div className="grid grid-cols-2 gap-2 text-[11px]">
												{selector && <D label="选择器" v={selector} />}
												{value && <D label="值" v={value} />}
												{tag && <D label="标签" v={tag} />}
												{text && <D label="文本" v={text} />}
												{url && <D label="URL" v={url} />}
												{x !== undefined && y !== undefined && <D label="坐标" v={`(${x},${y})`} />}
												<D label="时间" v={new Date(ts).toLocaleTimeString()} />
												<D label="耗时" v={`+${fmt(elapsed)}`} />
											</div>
											{hasScreenshot ? (
												<div>
													<img src={`data:image/png;base64,${hasScreenshot}`} alt={`步骤${i+1}`}
														className="w-full rounded border border-[var(--color-border-secondary)] max-h-40 object-cover" />
												</div>
											) : (
												<button onClick={() => captureActionScreenshot(i)} disabled={capturing === i}
													className="flex items-center gap-1 px-2 py-1 text-[10px] border rounded hover:bg-[var(--color-bg-hover)]">
													<Camera className={`w-3 h-3 ${capturing === i ? "animate-pulse" : ""}`} />
													{capturing === i ? "截取中..." : "📸 截图此元素"}
												</button>
											)}
										</div>
									)}
								</div>
							);
						})}
						{actions.length > 50 && <div className="text-center text-xs text-[var(--color-text-tertiary)] py-1">还有 {actions.length - 50} 条</div>}
					</div>
				</div>
			)}

			{/* 网络请求时间线 */}
			{actions.length === 0 && networks.length > 0 && (
				<div className="bg-[var(--color-bg-sidebar)] border border-[var(--color-border-primary)] rounded-xl p-4 mb-4">
					<h4 className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide mb-3">🌐 网络请求 ({networks.length})</h4>
					<div className="space-y-1 max-h-64 overflow-auto">
						{networks.slice(0, 30).map((n: any, i: number) => (
							<div key={i} className="flex items-center gap-2 px-2 py-1 text-xs hover:bg-[var(--color-bg-hover)] rounded">
								<span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]">{n.method || 'GET'}</span>
								<span className="text-[var(--color-text-secondary)] truncate flex-1">{n.path || n.url}</span>
								<span className="flex-shrink-0 text-[var(--color-text-tertiary)]">{n.status || '—'}</span>
							</div>
						))}
						{networks.length > 30 && <div className="text-center text-xs text-[var(--color-text-tertiary)] py-1">还有 {networks.length - 30} 个</div>}
					</div>
				</div>
			)}

			{/* Agent 思考过程 */}
			{thinking && (
				<details className="mb-4 text-xs text-[var(--color-text-tertiary)]" open>
					<summary className="cursor-pointer mb-1">💭 Agent 思考中...</summary>
					<div className="p-2 bg-[var(--color-bg-tertiary)] rounded-lg whitespace-pre-wrap max-h-40 overflow-auto">{thinking.slice(-1000)}</div>
				</details>
			)}

			{/* 加工结果 */}
			{result && (
				<div className="bg-[var(--color-bg-sidebar)] border border-[var(--color-accent)]/30 rounded-xl p-4">
					<h4 className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide mb-2">加工结果</h4>
					<div className="text-sm leading-relaxed whitespace-pre-wrap">{result}</div>
				</div>
			)}

			{analyzing && !result && !thinking && (
				<div className="text-center py-8 text-sm text-[var(--color-text-tertiary)]">
					<Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
					Agent 正在分析录制数据...
				</div>
			)}
		</div>
	);
}

// ===== 详情项 =====
function D({ label, v }: { label: string; v: string }) {
	return (
		<div className="flex flex-col">
			<span className="text-[var(--color-text-tertiary)] text-[10px]">{label}</span>
			<span className="text-[var(--color-text-primary)] font-mono text-xs break-all">{v}</span>
		</div>
	);
}

function fmt(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	return `${(ms / 1000).toFixed(1)}s`;
}
