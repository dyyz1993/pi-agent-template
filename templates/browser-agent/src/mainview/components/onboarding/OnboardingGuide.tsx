/**
 * OnboardingGuide — 浏览器未连接时的安装引导
 *
 * 用户视角的三步引导（不暴露 CDP/tunnel/xbrowser 等技术概念）：
 * 1. 创建连接 → 自动生成专属连接
 * 2. 下载扩展 → 下载已配置好的 Chrome 扩展
 * 3. 加载到 Chrome → 在 Chrome 中安装扩展，自动连接
 *
 * 对应 PRD §3.1 首次使用引导流程
 */

import { useState, useEffect, useCallback } from "react";
import {
	Globe,
	CheckCircle2,
	Loader2,
	RefreshCw,
	Download,
	Key,
	Puzzle,
	ArrowRight,
	ExternalLink,
} from "lucide-react";
import { useConnectionStore } from "../../stores/use-connection-store";
import { apiClient } from "../../lib/api-client";

type Step = "create" | "download" | "install";

export function OnboardingGuide() {
	const [step, setStep] = useState<Step>("create");
	const [browserKey, setBrowserKey] = useState<string | null>(null);
	const [creating, setCreating] = useState(false);
	const [downloading, setDownloading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [checking, setChecking] = useState(false);

	const checkBrowser = useConnectionStore((s) => s.checkBrowser);
	const browserStatus = useConnectionStore((s) => s.browserStatus);

	// 自动检测连接状态（扩展加载后会自动连上）
	const handleCheck = useCallback(async (): Promise<void> => {
		setChecking(true);
		await checkBrowser();
		setChecking(false);
	}, [checkBrowser]);

	useEffect(() => {
		// 每 5 秒自动检测（用户装好扩展后自动跳转）
		const interval = setInterval(() => {
			if (browserStatus !== "online") {
				checkBrowser();
			}
		}, 5000);
		return () => clearInterval(interval);
	}, [browserStatus, checkBrowser]);

	const handleCreate = async (): Promise<void> => {
		setCreating(true);
		setError(null);
		try {
			const baseUrl = apiClient.getBaseUrl();
			const token = apiClient.getAuthToken();
			const res = await fetch(`${baseUrl}/api/create-browser?token=${token}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: `Browser Agent` }),
			});
			if (!res.ok) throw new Error(`创建失败 (${res.status})`);
			const data = await res.json();
			if (data.key) {
				setBrowserKey(data.key);
				setStep("download");
			} else {
				throw new Error(data.error || "未返回 key");
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "创建连接失败");
		} finally {
			setCreating(false);
		}
	};

	const handleDownload = async (): Promise<void> => {
		if (!browserKey) return;
		setDownloading(true);
		setError(null);
		try {
			const baseUrl = apiClient.getBaseUrl();
			const token = apiClient.getAuthToken();
			const res = await fetch(`${baseUrl}/api/pack-extension?token=${token}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ key: browserKey }),
			});
			if (!res.ok) {
				const errData = await res.json().catch(() => ({}));
				throw new Error(errData.error || `下载失败 (${res.status})`);
			}
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "browser-agent-extension.zip";
			a.click();
			URL.revokeObjectURL(url);
			setStep("install");
		} catch (err) {
			setError(err instanceof Error ? err.message : "下载扩展失败");
		} finally {
			setDownloading(false);
		}
	};

	return (
		<div className="h-screen bg-[var(--color-bg-primary)] flex items-center justify-center p-6 overflow-auto">
			<div className="max-w-lg w-full">
				{/* 标题 */}
				<div className="text-center mb-8">
					<div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--color-accent)]/10 mb-4">
						<Globe className="w-8 h-8 text-[var(--color-text-accent)]" />
					</div>
					<h1 className="text-2xl font-bold mb-2">连接你的浏览器</h1>
					<p className="text-[var(--color-text-secondary)] text-sm">
						安装 Chrome 扩展后，Browser Agent 就能自动操作你的浏览器。整个过程不到 1 分钟。
					</p>
				</div>

				{/* 步骤卡片 */}
				<div className="space-y-3 mb-6">
					{/* 步骤 1：创建连接 */}
					<StepCard
						icon={<Key className="w-4 h-4" />}
						title="创建连接"
						desc="生成你的专属浏览器连接"
						done={!!browserKey}
						active={step === "create"}
					>
						{!browserKey && (
							<button
								onClick={handleCreate}
								disabled={creating}
								className="mt-3 px-4 py-2 text-sm bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
							>
								{creating ? (
									<Loader2 className="w-4 h-4 animate-spin" />
								) : (
									<Key className="w-4 h-4" />
								)}
								创建连接
							</button>
						)}
					</StepCard>

					{/* 步骤 2：下载扩展 */}
					<StepCard
						icon={<Download className="w-4 h-4" />}
						title="下载扩展"
						desc="下载已配置好连接的 Chrome 扩展"
						done={step === "install"}
						active={step === "download"}
						disabled={!browserKey}
					>
						{browserKey && step !== "install" && (
							<button
								onClick={handleDownload}
								disabled={downloading}
								className="mt-3 px-4 py-2 text-sm bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
							>
								{downloading ? (
									<Loader2 className="w-4 h-4 animate-spin" />
								) : (
									<Download className="w-4 h-4" />
								)}
								下载扩展 (ZIP)
							</button>
						)}
					</StepCard>

					{/* 步骤 3：加载到 Chrome */}
					<StepCard
						icon={<Puzzle className="w-4 h-4" />}
						title="加载到 Chrome"
						desc="解压 ZIP，在 Chrome 中加载扩展，自动连接"
						done={false}
						active={step === "install"}
						disabled={step !== "install"}
					>
						{step === "install" && (
							<div className="mt-3 space-y-2">
								<ol className="text-xs text-[var(--color-text-secondary)] space-y-1.5 pl-1">
									<li>
										<span className="text-[var(--color-text-tertiary)]">①</span> 解压下载的 ZIP 文件
									</li>
									<li>
										<span className="text-[var(--color-text-tertiary)]">②</span> 打开{" "}
										<code className="px-1 py-0.5 bg-[var(--color-bg-tertiary)] rounded text-[var(--color-text-accent)]">
											chrome://extensions/
										</code>
									</li>
									<li>
										<span className="text-[var(--color-text-tertiary)]">③</span> 开启右上角「开发者模式」
									</li>
									<li>
										<span className="text-[var(--color-text-tertiary)]">④</span> 点击「加载已解压的扩展程序」，选择解压的文件夹
									</li>
								</ol>
								<div className="flex gap-2 pt-1">
									<a
										href="chrome://extensions/"
										className="px-3 py-1.5 text-xs border border-[var(--color-border-primary)] rounded hover:bg-[var(--color-bg-hover)] flex items-center gap-1"
									>
										<ExternalLink className="w-3 h-3" />
										打开扩展页
									</a>
									<button
										onClick={handleCheck}
										disabled={checking}
										className="px-3 py-1.5 text-xs bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded transition-colors disabled:opacity-50 flex items-center gap-1"
									>
										{checking ? (
											<Loader2 className="w-3 h-3 animate-spin" />
										) : (
											<RefreshCw className="w-3 h-3" />
										)}
										检测连接
									</button>
								</div>
							</div>
						)}
					</StepCard>
				</div>

				{/* 错误提示 */}
				{error && (
					<div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-[var(--color-text-error)] mb-4">
						{error}
					</div>
				)}

				{/* 底部提示 */}
				<div className="text-center text-xs text-[var(--color-text-tertiary)] flex items-center justify-center gap-2">
					<RefreshCw className={`w-3 h-3 ${checking ? "animate-spin" : ""}`} />
					<span>扩展加载后每 5 秒自动检测，连上后自动进入工作台</span>
				</div>
			</div>
		</div>
	);
}

// ===== 步骤卡片组件 =====

interface StepCardProps {
	icon: React.ReactNode;
	title: string;
	desc: string;
	done: boolean;
	active: boolean;
	disabled?: boolean;
	children?: React.ReactNode;
}

function StepCard({ icon, title, desc, done, active, disabled, children }: StepCardProps) {
	return (
		<div
			className={`p-4 rounded-xl border transition-all ${
				done
					? "border-[var(--color-text-success)]/30 bg-[var(--color-text-success)]/5"
					: active
						? "border-[var(--color-accent)] bg-[var(--color-accent)]/5"
						: "border-[var(--color-border-primary)] bg-[var(--color-bg-sidebar)]"
			} ${disabled ? "opacity-40" : ""}`}
		>
			<div className="flex items-center gap-3">
				<div
					className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
						done
							? "bg-[var(--color-text-success)]/20 text-[var(--color-text-success)]"
							: active
								? "bg-[var(--color-accent)]/20 text-[var(--color-text-accent)]"
								: "bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]"
					}`}
				>
					{done ? <CheckCircle2 className="w-4 h-4" /> : icon}
				</div>
				<div className="flex-1 min-w-0">
					<div className="text-sm font-medium flex items-center gap-2">
						{title}
						{done && (
							<span className="text-[10px] text-[var(--color-text-success)]">已完成</span>
						)}
					</div>
					<div className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{desc}</div>
				</div>
				{active && !done && children && (
					<ArrowRight className="w-4 h-4 text-[var(--color-text-accent)] flex-shrink-0" />
				)}
			</div>
			{/* 展开的操作区 */}
			{active && !done && children && (
				<div className="mt-3 pl-11">{children}</div>
			)}
		</div>
	);
}
