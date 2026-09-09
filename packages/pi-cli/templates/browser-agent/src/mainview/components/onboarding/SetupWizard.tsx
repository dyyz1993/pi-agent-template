/**
 * SetupWizard — 浏览器连接向导 Modal
 *
 * 未连接时，从顶栏入口触发。全屏遮罩 + 居中步骤卡片。
 * 实时检测连接状态，用户装好扩展后自动跳到成功页。
 */

import { useState, useEffect, useCallback } from "react";
import {
	Globe,
	CheckCircle2,
	Loader2,
	Download,
	Key,
	Puzzle,
	ExternalLink,
	X,
	PartyPopper,
	AlertCircle,
} from "lucide-react";
import { useConnectionStore } from "../../stores/use-connection-store";
import { apiClient } from "../../lib/api-client";

export function SetupWizard({ onClose }: { onClose: () => void }) {
	const browserStatus = useConnectionStore((s) => s.browserStatus);
	const checkBrowser = useConnectionStore((s) => s.checkBrowser);
	const startConnectionPolling = useConnectionStore((s) => s.startConnectionPolling);

	const [browserKey, setBrowserKey] = useState<string | null>(null);
	const [creating, setCreating] = useState(false);
	const [downloading, setDownloading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const isConnected = browserStatus === "online";

	// 启动轮询（如果还没在轮询）
	useEffect(() => {
		startConnectionPolling();
	}, [startConnectionPolling]);

	const handleCreate = async (): Promise<void> => {
		setCreating(true);
		setError(null);
		try {
			const baseUrl = apiClient.getBaseUrl();
			const token = apiClient.getAuthToken();
			const res = await fetch(`${baseUrl}/api/create-browser?token=${token}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "Browser Agent" }),
			});
			if (!res.ok) throw new Error(`创建失败 (${res.status})`);
			const data = await res.json();
			if (data.key) {
				setBrowserKey(data.key);
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
		} catch (err) {
			setError(err instanceof Error ? err.message : "下载扩展失败");
		} finally {
			setDownloading(false);
		}
	};

	const handleManualCheck = useCallback(async (): Promise<void> => {
		await checkBrowser();
	}, [checkBrowser]);

	return (
		<div
			className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
			onClick={onClose}
		>
			<div
				className="max-w-lg w-full bg-[var(--color-bg-sidebar)] border border-[var(--color-border-primary)] rounded-2xl shadow-2xl max-h-[90vh] overflow-auto"
				onClick={(e) => e.stopPropagation()}
			>
				{/* 成功状态 */}
				{isConnected ? (
					<SuccessView onClose={onClose} />
				) : (
					<>
						{/* 头部 */}
						<div className="flex items-center justify-between p-5 border-b border-[var(--color-border-primary)]">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/10 flex items-center justify-center">
									<Globe className="w-5 h-5 text-[var(--color-text-accent)]" />
								</div>
								<div>
									<h2 className="text-base font-semibold">连接你的浏览器</h2>
									<p className="text-xs text-[var(--color-text-tertiary)]">
										安装扩展，1 分钟搞定
									</p>
								</div>
							</div>
							<button
								onClick={onClose}
								className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] p-1"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						{/* 步骤内容 */}
						<div className="p-5 space-y-3">
							{/* 步骤 1 */}
							<Step
								icon={<Key className="w-4 h-4" />}
								title="创建连接"
								desc="生成你的专属浏览器连接"
								state={browserKey ? "done" : "active"}
							>
								{!browserKey && (
									<button
										onClick={handleCreate}
										disabled={creating}
										className="px-3 py-1.5 text-xs bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded transition-colors disabled:opacity-50 flex items-center gap-1.5"
									>
										{creating ? (
											<Loader2 className="w-3 h-3 animate-spin" />
										) : (
											<Key className="w-3 h-3" />
										)}
										创建连接
									</button>
								)}
							</Step>

							{/* 步骤 2 */}
							<Step
								icon={<Download className="w-4 h-4" />}
								title="下载扩展"
								desc="下载已配置好连接的 Chrome 扩展"
								state={browserKey ? "active" : "pending"}
							>
								{browserKey && (
									<button
										onClick={handleDownload}
										disabled={downloading}
										className="px-3 py-1.5 text-xs bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded transition-colors disabled:opacity-50 flex items-center gap-1.5"
									>
										{downloading ? (
											<Loader2 className="w-3 h-3 animate-spin" />
										) : (
											<Download className="w-3 h-3" />
										)}
										下载扩展 (ZIP)
									</button>
								)}
							</Step>

							{/* 步骤 3 */}
							<Step
								icon={<Puzzle className="w-4 h-4" />}
								title="加载到 Chrome"
								desc="安装扩展后自动连接，无需手动操作"
								state={browserKey ? "active" : "pending"}
							>
								{browserKey && (
									<div className="space-y-2">
										<ol className="text-xs text-[var(--color-text-secondary)] space-y-1">
											<li>① 解压下载的 ZIP 文件</li>
											<li>② 打开 chrome://extensions/</li>
											<li>③ 开启右上角「开发者模式」</li>
											<li>④ 点击「加载已解压的扩展程序」</li>
										</ol>
										<div className="flex gap-2">
											<a
												href="chrome://extensions/"
												className="px-2.5 py-1.5 text-xs border border-[var(--color-border-primary)] rounded hover:bg-[var(--color-bg-hover)] flex items-center gap-1"
											>
												<ExternalLink className="w-3 h-3" />
												打开扩展页
											</a>
											<button
												onClick={handleManualCheck}
												className="px-2.5 py-1.5 text-xs bg-[var(--color-accent)]/20 text-[var(--color-text-accent)] rounded hover:bg-[var(--color-accent)]/30 flex items-center gap-1"
											>
												立即检测
											</button>
										</div>
									</div>
								)}
							</Step>

							{/* 错误 */}
							{error && (
								<div className="flex items-start gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-[var(--color-text-error)]">
									<AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
									<span>{error}</span>
								</div>
							)}
						</div>

						{/* 底部：实时检测提示 */}
						<div className="px-5 py-3 border-t border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] rounded-b-2xl flex items-center justify-center gap-2 text-xs text-[var(--color-text-tertiary)]">
							<span className="relative flex w-2 h-2">
								<span className="absolute inline-flex w-full h-full rounded-full bg-[var(--color-text-accent)] opacity-60 animate-ping" />
								<span className="relative inline-flex w-2 h-2 rounded-full bg-[var(--color-text-accent)]" />
							</span>
							<span>正在实时检测，扩展加载后自动进入工作台</span>
						</div>
					</>
				)}
			</div>
		</div>
	);
}

// ===== 成功视图 =====

function SuccessView({ onClose }: { onClose: () => void }) {
	return (
		<div className="p-8 text-center">
			<div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--color-text-success)]/10 mb-4">
				<PartyPopper className="w-8 h-8 text-[var(--color-text-success)]" />
			</div>
			<h2 className="text-xl font-bold mb-2">连接成功！</h2>
			<p className="text-sm text-[var(--color-text-secondary)] mb-6">
				浏览器已连接，可以开始使用了。
			</p>
			<button
				onClick={onClose}
				className="px-6 py-2.5 text-sm bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded-lg transition-colors"
			>
				开始使用
			</button>
		</div>
	);
}

// ===== 步骤组件 =====

type StepState = "pending" | "active" | "done";

function Step({
	icon,
	title,
	desc,
	state,
	children,
}: {
	icon: React.ReactNode;
	title: string;
	desc: string;
	state: StepState;
	children?: React.ReactNode;
}) {
	return (
		<div
			className={`p-3.5 rounded-xl border transition-all ${
				state === "done"
					? "border-[var(--color-text-success)]/30 bg-[var(--color-text-success)]/5"
					: state === "active"
						? "border-[var(--color-accent)] bg-[var(--color-accent)]/5"
						: "border-[var(--color-border-secondary)] opacity-50"
			}`}
		>
			<div className="flex items-center gap-3">
				<div
					className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
						state === "done"
							? "bg-[var(--color-text-success)]/20 text-[var(--color-text-success)]"
							: state === "active"
								? "bg-[var(--color-accent)]/20 text-[var(--color-text-accent)]"
								: "bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]"
					}`}
				>
					{state === "done" ? <CheckCircle2 className="w-4 h-4" /> : icon}
				</div>
				<div className="flex-1 min-w-0">
					<div className="text-sm font-medium">{title}</div>
					<div className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{desc}</div>
				</div>
			</div>
			{state === "active" && children && <div className="mt-3 pl-11">{children}</div>}
		</div>
	);
}
