import { Send, Play, Square, File, ChevronRight, ChevronDown, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../stores/use-app-store";
import { useLogStore } from "../../stores/use-log-store";
import type { DemoMethod } from "../../types";

const COLLAPSED_KEY = "debug-panel-collapsed";

function readCollapsed(): boolean {
	try {
		return localStorage.getItem(COLLAPSED_KEY) === "true";
	} catch {
		return false;
	}
}

export function DebugPanel() {
	const { t } = useTranslation();
	const [collapsed, setCollapsed] = useState(readCollapsed);

	useEffect(() => {
		try {
			localStorage.setItem(COLLAPSED_KEY, String(collapsed));
		} catch {
			/* ignore */
		}
	}, [collapsed]);

	const method = useAppStore((s) => s.method);
	const result = useAppStore((s) => s.result);
	const logs = useLogStore((s) => s.logs);
	const tickEvents = useAppStore((s) => s.tickEvents);
	const tickCount = useAppStore((s) => s.tickCount);
	const subscriptionId = useAppStore((s) => s.subscriptionId);
	const timerRunning = useAppStore((s) => s.timerRunning);
	const setMethod = useAppStore((s) => s.setMethod);
	const callRPC = useAppStore((s) => s.callRPC);
	const handleSubscribe = useAppStore((s) => s.handleSubscribe);
	const handleUnsubscribe = useAppStore((s) => s.handleUnsubscribe);
	const clearDebug = useAppStore((s) => s.clearDebug);

	if (collapsed) {
		return (
			<div className="w-12 bg-[var(--color-bg-primary)] border-l border-[var(--color-border-primary)] flex flex-col items-center justify-start pt-2 flex-shrink-0">
				<button
					onClick={() => setCollapsed(false)}
					title={t("debug.expandPanel")}
					className="w-10 h-6 flex items-center gap-1 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
				>
					<ChevronRight className="w-3 h-3" />
					{t("tabs.debug")}
				</button>
			</div>
		);
	}

	return (
		<div className="w-72 bg-[var(--color-bg-primary)] border-l border-[var(--color-border-primary)] flex flex-col flex-shrink-0 overflow-y-auto">
			<div className="flex items-center justify-between px-2 py-1.5 border-b border-[var(--color-border-primary)]">
				<button
					onClick={() => setCollapsed(true)}
					title={t("debug.collapsePanel")}
					className="flex items-center gap-1 text-[11px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
				>
					<ChevronDown className="w-3 h-3" />
					{t("tabs.debug")}
				</button>
				<button
					onClick={clearDebug}
					title={t("debug.clearAll")}
					className="flex items-center gap-1 text-[11px] text-[var(--color-text-placeholder)] hover:text-[var(--color-text-error)] transition-colors"
				>
					<Trash2 className="w-3 h-3" />
					{t("debug.clear")}
				</button>
			</div>
			{/* RPC Calls */}
			<div className="p-3 border-b border-[var(--color-border-primary)]">
				<div className="flex items-center justify-between mb-2">
					<h2 className="text-xs font-semibold flex items-center gap-1.5">
						<Send className="w-3.5 h-3.5 text-[var(--color-text-accent)]" />
						{t("debug.rpcCalls")}
					</h2>
				</div>
				<div className="flex gap-2 mb-2">
					<select
						aria-label={t("debug.rpcCalls")}
						value={method}
						onChange={(e) => setMethod(e.target.value as DemoMethod)}
						className="flex-1 px-2 py-1 text-xs bg-[var(--color-bg-tertiary)] rounded text-[var(--color-text-primary)] border border-[var(--color-border-secondary)]"
					>
						<option value="system.ping">system.ping</option>
						<option value="system.hello">system.hello</option>
						<option value="system.echo">system.echo</option>
						<option value="chat.send">chat.send</option>
					</select>
					<button
						onClick={() => callRPC("")}
						className="px-3 py-1 text-xs bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded transition-colors flex items-center gap-1"
					>
						<Play className="w-3 h-3" />
						{t("debug.call")}
					</button>
				</div>
				{!!result && (
					<div className="bg-[var(--color-bg-tertiary)] rounded p-2">
						<pre className="text-[var(--color-text-success)] text-[11px] overflow-x-auto whitespace-pre-wrap">
							{JSON.stringify(result, null, 2)}
						</pre>
					</div>
				)}
			</div>

			{/* Subscriptions */}
			<div className="p-3 border-b border-[var(--color-border-primary)]">
				<div className="flex items-center justify-between mb-2">
					<h2 className="text-xs font-semibold flex items-center gap-1.5">
						{timerRunning ? (
							<Square className="w-3.5 h-3.5 text-[var(--color-text-success)] fill-[var(--color-text-success)]" />
						) : (
							<Play className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
						)}
						{t("debug.subscriptions")}
						{timerRunning && (
							<span className="ml-1 px-1.5 py-0.5 bg-[var(--color-text-success)]/30 text-[var(--color-text-success)] rounded text-[10px]">
								{t("feed.live")}
							</span>
						)}
					</h2>
					<div className="flex gap-2 items-center">
						<span className="text-[11px] text-[var(--color-text-tertiary)]">
							{t("debug.events", { count: tickCount })}
						</span>
						{!subscriptionId ? (
							<button
								onClick={handleSubscribe}
								className="px-2 py-0.5 text-xs bg-[var(--color-text-success)] hover:opacity-80 rounded transition-colors"
							>
								{t("debug.subscribe")}
							</button>
						) : (
							<button
								onClick={handleUnsubscribe}
								className="px-2 py-0.5 text-xs bg-[var(--color-text-error)] hover:opacity-80 rounded transition-colors"
							>
								{t("debug.unsubscribe")}
							</button>
						)}
					</div>
				</div>
				<div className="bg-[var(--color-bg-tertiary)] rounded p-2 max-h-32 overflow-y-auto font-mono text-[11px]">
					{tickEvents.length === 0 ? (
						<div className="text-[var(--color-text-placeholder)] text-center py-1">
							{t("debug.noEvents")}
						</div>
					) : (
						tickEvents.map((ev, i) => (
							<div key={i} className="text-[var(--color-text-info)]">
								{ev}
							</div>
						))
					)}
				</div>
			</div>

			{/* Logs */}
			<div className="p-3 flex flex-col flex-1 min-h-0">
				<h2 className="text-xs font-semibold mb-2 flex-shrink-0 flex items-center gap-1.5">
					<File className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
					{t("debug.logs")}
				</h2>
				<div className="flex-1 bg-black rounded p-2 overflow-y-auto font-mono text-[11px]">
					{logs.map((log, i) => (
						<div
							key={i}
							className={
								log.includes("Error")
									? "text-[var(--color-text-error)]"
									: "text-[var(--color-text-success)]"
							}
						>
							{log}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
