/**
 * Code 视图 — 地址栏 + URL 管理
 *
 * 浏览器预览已移到右侧边栏 PreviewBlock。
 * CodeView 只负责地址栏和 URL 管理，不渲染 iframe。
 */
import { useEffect } from 'react';
import { Globe, ArrowUpRight } from 'lucide-react';
import { usePreviewStore } from '../../stores/use-preview-store';
import { AddressBar } from './AddressBar';

export function CodeView() {
	const currentTab = usePreviewStore((s) => s.currentTab);
	const openUrl = usePreviewStore((s) => s.openUrl);
	const loadHistory = usePreviewStore((s) => s.loadHistory);
	const history = usePreviewStore((s) => s.history);

	useEffect(() => {
		loadHistory();
	}, []);

	return (
		<div className="flex-1 flex flex-col overflow-hidden bg-[var(--color-bg-primary)]">
			<AddressBar />

			<div className="flex-1 overflow-auto">
				{currentTab ? (
					<div className="px-6 py-6 max-w-lg mx-auto">
						<div className="flex items-center gap-3 mb-4">
							<div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
								<Globe className="w-5 h-5 text-green-600 dark:text-green-400" />
							</div>
							<div>
								<div className="text-sm font-medium text-[var(--color-text-primary)]">
									预览已就绪
								</div>
								<div className="text-xs text-[var(--color-text-tertiary)] font-mono truncate max-w-[300px]">
									{currentTab.url}
								</div>
							</div>
						</div>
						<p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
							页面已在右侧 Preview 面板中加载。 使用选取元素工具可以提取 CSS 选择器。
						</p>
					</div>
				) : (
					<div className="px-6 py-12 max-w-md mx-auto">
						<div className="text-center">
							<div className="w-16 h-16 rounded-2xl bg-[var(--color-bg-tertiary)] flex items-center justify-center mx-auto mb-4">
								<Globe className="w-8 h-8 text-[var(--color-text-tertiary)]" />
							</div>
							<p className="text-base font-medium text-[var(--color-text-secondary)] mb-2">
								在浏览器中预览你的应用
							</p>
							<p className="text-sm text-[var(--color-text-tertiary)] mb-6">
								在地址栏输入 URL，页面将在右侧面板加载
							</p>
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
									<ArrowUpRight className="w-4 h-4 ml-auto text-[var(--color-text-tertiary)]" />
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
								在右侧 Preview 面板中你还可以选取页面元素提取 CSS 选择器
							</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
