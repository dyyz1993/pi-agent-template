/**
 * ConnectBanner — 未连接时在对话区顶部显示的引导横幅
 *
 * 精简版引导：创建连接 → 下载扩展 → 提示加载到 Chrome
 * 始终显示工作台，横幅不遮挡界面
 */

import { useState } from "react";
import { Key, Download, Loader2, Puzzle, ExternalLink, X } from "lucide-react";
import { useConnectionStore } from "../../stores/use-connection-store";
import { apiClient } from "../../lib/api-client";

export function ConnectBanner() {
	const [dismissed, setDismissed] = useState(false);
	const [browserKey, setBrowserKey] = useState<string | null>(null);
	const [creating, setCreating] = useState(false);
	const [downloading, setDownloading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const browserStatus = useConnectionStore((s) => s.browserStatus);

	// 已连接或已关闭 → 不显示
	if (browserStatus === "online" || dismissed) return null;

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
			if (data.key) setBrowserKey(data.key);
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

	return (
		<div className="mx-4 mt-3 p-3 rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5">
			<div className="flex items-start gap-3">
				{/* 图标 */}
				<div className="w-8 h-8 rounded-lg bg-[var(--color-accent)]/15 flex items-center justify-center flex-shrink-0">
					<Puzzle className="w-4 h-4 text-[var(--color-text-accent)]" />
				</div>

				{/* 内容 */}
				<div className="flex-1 min-w-0">
					<div className="text-sm font-medium mb-1">连接你的浏览器</div>
					<div className="text-xs text-[var(--color-text-tertiary)] mb-2">
						安装扩展后即可自动操作 Chrome
					</div>

					{/* 操作按钮 */}
					<div className="flex items-center gap-2 flex-wrap">
						{!browserKey ? (
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
						) : (
							<>
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
									下载扩展
								</button>
								<span className="text-[10px] text-[var(--color-text-tertiary)]">
									解压后在 chrome://extensions 加载
								</span>
								<a
									href="chrome://extensions/"
									className="px-2 py-1.5 text-xs border border-[var(--color-border-primary)] rounded hover:bg-[var(--color-bg-hover)] flex items-center gap-1"
								>
									<ExternalLink className="w-3 h-3" />
									扩展页
								</a>
							</>
						)}
					</div>

					{/* 错误 */}
					{error && (
						<div className="text-xs text-[var(--color-text-error)] mt-2">{error}</div>
					)}
				</div>

				{/* 关闭按钮 */}
				<button
					onClick={() => setDismissed(true)}
					className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] flex-shrink-0"
				>
					<X className="w-4 h-4" />
				</button>
			</div>
		</div>
	);
}
