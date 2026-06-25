/**
 * OnboardingGuide — 浏览器未连接时的全屏引导
 *
 * 对应 PRD §3.1 首次使用引导流程。
 * 检测 cdp-tunnel / xbrowser / Chrome 扩展状态，引导用户完成连接。
 */

import { useState, useEffect, useCallback } from "react";
import {
	Globe,
	CheckCircle2,
	XCircle,
	Loader2,
	RefreshCw,
	AlertTriangle,
	Puzzle,
} from "lucide-react";
import { apiClient } from "../../lib/api-client";

interface GuideStep {
	title: string;
	detail: string;
	done: boolean;
}

interface GuideInfo {
	cdpEndpoint: string;
	cdpTunnelRunning: boolean;
	cdpTunnelVersion: string | null;
	xbrowserVersion: string | null;
	steps: GuideStep[];
}

export function OnboardingGuide() {
	const [guide, setGuide] = useState<GuideInfo | null>(null);
	const [loading, setLoading] = useState(true);
	const [checking, setChecking] = useState(false);

	const fetchGuide = useCallback(async () => {
		setChecking(true);
		try {
			const result = await apiClient.call("browser.getConnectionGuide", {});
			setGuide(result);
		} catch {
			// 如果接口失败，展示基础引导
			setGuide({
				cdpEndpoint: "http://localhost:9221",
				cdpTunnelRunning: false,
				cdpTunnelVersion: null,
				xbrowserVersion: null,
				steps: [],
			});
		} finally {
			setLoading(false);
			setChecking(false);
		}
	}, []);

	useEffect(() => {
		fetchGuide();
		// 每 10 秒自动检测一次（等用户完成安装后自动刷新）
		const interval = setInterval(fetchGuide, 10000);
		return () => clearInterval(interval);
	}, [fetchGuide]);

	if (loading) {
		return (
			<div className="h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
				<Loader2 className="w-6 h-6 animate-spin text-[var(--color-text-accent)]" />
			</div>
		);
	}

	const allDone = guide?.steps.every((s) => s.done) ?? false;

	return (
		<div className="h-screen bg-[var(--color-bg-primary)] flex items-center justify-center p-6 overflow-auto">
			<div className="max-w-2xl w-full">
				{/* 标题 */}
				<div className="text-center mb-8">
					<div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--color-accent)]/10 mb-4">
						<Globe className="w-8 h-8 text-[var(--color-text-accent)]" />
					</div>
					<h1 className="text-2xl font-bold mb-2">连接你的浏览器</h1>
					<p className="text-[var(--color-text-secondary)] text-sm">
						Browser Agent 需要连接你的 Chrome 浏览器才能执行操作。按以下步骤完成连接。
					</p>
				</div>

				{/* 状态卡片 */}
				<div className="bg-[var(--color-bg-sidebar)] border border-[var(--color-border-primary)] rounded-xl p-6 mb-6">
					{/* cdp-tunnel 状态 */}
					<div className="flex items-center justify-between py-2 border-b border-[var(--color-border-secondary)]">
						<div className="flex items-center gap-3">
							{guide?.cdpTunnelRunning ? (
								<CheckCircle2 className="w-5 h-5 text-[var(--color-text-success)]" />
							) : (
								<XCircle className="w-5 h-5 text-[var(--color-text-error)]" />
							)}
							<div>
								<div className="text-sm font-medium">cdp-tunnel</div>
								<div className="text-xs text-[var(--color-text-tertiary)]">
									{guide?.cdpTunnelRunning
										? `运行中 · ${guide.cdpTunnelVersion || "已安装"}`
										: "未运行 — 浏览器隧道服务"}
								</div>
							</div>
						</div>
						{!guide?.cdpTunnelRunning && (
							<code className="text-xs px-2 py-1 bg-[var(--color-bg-tertiary)] rounded text-[var(--color-text-accent)]">
								cdp-tunnel
							</code>
						)}
					</div>

					{/* xbrowser 状态 */}
					<div className="flex items-center justify-between py-2 border-b border-[var(--color-border-secondary)]">
						<div className="flex items-center gap-3">
							{guide?.xbrowserVersion ? (
								<CheckCircle2 className="w-5 h-5 text-[var(--color-text-success)]" />
							) : (
								<XCircle className="w-5 h-5 text-[var(--color-text-error)]" />
							)}
							<div>
								<div className="text-sm font-medium">xbrowser CLI</div>
								<div className="text-xs text-[var(--color-text-tertiary)]">
									{guide?.xbrowserVersion
										? `v${guide.xbrowserVersion} 已安装`
										: "未安装 — 浏览器操作引擎"}
								</div>
							</div>
						</div>
						{!guide?.xbrowserVersion && (
							<code className="text-xs px-2 py-1 bg-[var(--color-bg-tertiary)] rounded text-[var(--color-text-accent)]">
								brew install xbrowser
							</code>
						)}
					</div>

					{/* Chrome 扩展状态 */}
					<div className="flex items-center justify-between py-2">
						<div className="flex items-center gap-3">
						<div className="w-5 h-5 flex items-center justify-center">
							<Puzzle className="w-4 h-4 text-[var(--color-text-tertiary)]" />
						</div>
							<div>
								<div className="text-sm font-medium">Chrome 扩展</div>
								<div className="text-xs text-[var(--color-text-tertiary)]">
									连接你的 Chrome 到 cdp-tunnel
								</div>
							</div>
						</div>
						<span className="text-xs text-[var(--color-text-tertiary)]">需手动安装</span>
					</div>
				</div>

				{/* 引导步骤 */}
				{guide?.steps && guide.steps.length > 0 && !allDone && (
					<div className="space-y-3 mb-6">
						<div className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wide">
							连接步骤
						</div>
						{guide.steps
							.filter((s) => !s.done)
							.map((step, i) => (
								<div
									key={i}
									className="flex items-start gap-3 p-3 bg-[var(--color-bg-sidebar)] border border-[var(--color-border-primary)] rounded-lg"
								>
									<div className="w-6 h-6 rounded-full bg-[var(--color-accent)]/20 text-[var(--color-text-accent)] flex items-center justify-center text-xs font-bold flex-shrink-0">
										{i + 1}
									</div>
									<div className="flex-1 min-w-0">
										<div className="text-sm font-medium">{step.title}</div>
										<div className="text-xs text-[var(--color-text-tertiary)] mt-0.5 font-mono break-all">
											{step.detail}
										</div>
									</div>
								</div>
							))}
					</div>
				)}

				{/* 注意事项 */}
				{guide?.cdpTunnelRunning && !allDone && (
					<div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg mb-6">
						<AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
						<div className="text-xs text-[var(--color-text-secondary)]">
							cdp-tunnel 已运行，但未检测到 Chrome 连接。请确认 Chrome 扩展已加载并连接到{" "}
							<code className="px-1 py-0.5 bg-[var(--color-bg-tertiary)] rounded">
								{guide.cdpEndpoint}
							</code>
						</div>
					</div>
				)}

				{/* 操作按钮 */}
				<div className="flex items-center justify-between gap-3">
					<div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
						<RefreshCw
							className={`w-3 h-3 ${checking ? "animate-spin" : ""}`}
						/>
						<span>每 10 秒自动检测</span>
					</div>
					<button
						onClick={fetchGuide}
						disabled={checking}
						className="px-4 py-2 text-sm bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
					>
						{checking ? (
							<Loader2 className="w-4 h-4 animate-spin" />
						) : (
							<RefreshCw className="w-4 h-4" />
						)}
						重新检测
					</button>
				</div>

				{/* 调试信息（可折叠） */}
				<details className="mt-6 text-xs text-[var(--color-text-tertiary)]">
					<summary className="cursor-pointer hover:text-[var(--color-text-secondary)]">
						调试信息
					</summary>
					<div className="mt-2 p-3 bg-[var(--color-bg-sidebar)] rounded font-mono space-y-1">
						<div>CDP Endpoint: {guide?.cdpEndpoint}</div>
						<div>cdp-tunnel: {guide?.cdpTunnelRunning ? "running" : "stopped"}</div>
						<div>xbrowser: {guide?.xbrowserVersion ? `v${guide.xbrowserVersion}` : "not found"}</div>
					</div>
				</details>
			</div>
		</div>
	);
}
