/**
 * Code 视图 — 内嵌浏览器预览
 *
 * 用户输入 URL → 调 preview.open → iframe 渲染（Web）或 webview 容器（桌面）
 */
import { useEffect } from 'react';
import { Globe } from 'lucide-react';
import { usePreviewStore } from '../../stores/use-preview-store';
import { AddressBar } from './AddressBar';
import { PreviewFrame } from './PreviewFrame';

export function CodeView() {
	const currentTab = usePreviewStore((s) => s.currentTab);
	const useIframe = usePreviewStore((s) => s.useIframe);
	const openUrl = usePreviewStore((s) => s.openUrl);
	const loadHistory = usePreviewStore((s) => s.loadHistory);
	const history = usePreviewStore((s) => s.history);

	useEffect(() => {
		loadHistory();
	}, []);

	return (
		<div className="flex-1 flex flex-col overflow-hidden bg-[var(--color-bg-primary)]">
			{/* 地址栏 */}
			<AddressBar />

			{/* 预览区 */}
			<div className="flex-1 overflow-hidden">
				{currentTab ? (
					<PreviewFrame tab={currentTab} useIframe={useIframe} />
				) : (
					<div className="w-full h-full flex items-center justify-center">
						<div className="text-center max-w-sm px-6">
							<div className="w-16 h-16 rounded-2xl bg-[var(--color-bg-tertiary)] flex items-center justify-center mx-auto mb-4">
								<Globe className="w-8 h-8 text-[var(--color-text-tertiary)]" />
							</div>
							<p className="text-base font-medium text-[var(--color-text-secondary)] mb-2">
								进入你的应用预览
							</p>
							<p className="text-sm text-[var(--color-text-tertiary)] mb-6">
								在地址栏输入 URL，查看运行中的本地应用
							</p>

							{/* 快速启动按钮 */}
							<div className="space-y-2">
								<button
									onClick={() => openUrl('localhost:5173')}
									className="w-full text-left px-4 py-3 rounded-xl border border-[var(--color-border-primary)] hover:border-[var(--color-text-accent)] transition-all text-sm flex items-center gap-3"
								>
									<div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 font-mono text-xs font-bold">
										V
									</div>
									<div>
										<div className="font-medium text-[var(--color-text-primary)]">
											Vite Dev Server
										</div>
										<div className="text-xs text-[var(--color-text-tertiary)]">localhost:5173</div>
									</div>
								</button>

								{history.length > 0 && (
									<>
										<p className="text-xs text-[var(--color-text-tertiary)] pt-2 pb-1 font-medium">
											Recents
										</p>
										{history.slice(0, 5).map((url, i) => (
											<button
												key={i}
												onClick={() => openUrl(url)}
												className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-[var(--color-bg-hover)] transition-colors text-sm flex items-center gap-3"
											>
												<div className="w-2 h-2 rounded-full bg-[var(--color-text-tertiary)]" />
												<span className="text-[var(--color-text-secondary)] truncate">{url}</span>
											</button>
										))}
									</>
								)}
							</div>

							<p className="text-xs text-[var(--color-text-tertiary)] mt-6">
								It may take a moment for the preview to connect.
							</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
