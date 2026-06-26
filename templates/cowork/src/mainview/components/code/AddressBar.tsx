/**
 * 地址栏 — URL 输入 + 导航按钮 + 加载指示器
 */
import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Loader2, X } from 'lucide-react';
import { usePreviewStore } from '../../stores/use-preview-store';

export function AddressBar() {
	const [urlInput, setUrlInput] = useState('');
	const currentTab = usePreviewStore((s) => s.currentTab);
	const navState = usePreviewStore((s) => s.navState);
	const openUrl = usePreviewStore((s) => s.openUrl);
	const navigate = usePreviewStore((s) => s.navigate);
	const closeTab = usePreviewStore((s) => s.closeTab);

	// URL 输入框同步当前标签 URL
	useEffect(() => {
		if (currentTab) setUrlInput(currentTab.url);
	}, [currentTab]);

	const handleSubmit = useCallback(() => {
		if (urlInput.trim()) openUrl(urlInput.trim());
	}, [urlInput, openUrl]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				handleSubmit();
			}
		},
		[handleSubmit],
	);

	return (
		<div className="h-11 flex items-center gap-1.5 px-3 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] flex-shrink-0">
			{/* 后退 */}
			<button
				onClick={() => navigate('back')}
				disabled={!currentTab?.canGoBack}
				className="p-1.5 rounded-lg hover:bg-[var(--color-bg-hover)] disabled:opacity-30 transition-colors text-[var(--color-text-tertiary)]"
				title="Back"
			>
				<ArrowLeft className="w-4 h-4" />
			</button>

			{/* 前进 */}
			<button
				onClick={() => navigate('forward')}
				disabled={!currentTab?.canGoForward}
				className="p-1.5 rounded-lg hover:bg-[var(--color-bg-hover)] disabled:opacity-30 transition-colors text-[var(--color-text-tertiary)]"
				title="Forward"
			>
				<ArrowRight className="w-4 h-4" />
			</button>

			{/* 刷新 */}
			<button
				onClick={() => navigate('reload')}
				disabled={!currentTab}
				className="p-1.5 rounded-lg hover:bg-[var(--color-bg-hover)] disabled:opacity-30 transition-colors text-[var(--color-text-tertiary)]"
				title="Reload"
			>
				{navState === 'loading' ? (
					<Loader2 className="w-4 h-4 animate-spin" />
				) : (
					<RotateCw className="w-4 h-4" />
				)}
			</button>

			{/* URL 输入框 */}
			<input
				value={urlInput}
				onChange={(e) => setUrlInput(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder="输入 URL，如 localhost:5173"
				className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-placeholder)] focus:border-[var(--color-text-accent)] outline-none transition-colors"
			/>

			{/* 关闭标签 */}
			{currentTab && (
				<button
					onClick={closeTab}
					className="p-1.5 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors text-[var(--color-text-tertiary)]"
					title="Close preview"
				>
					<X className="w-4 h-4" />
				</button>
			)}
		</div>
	);
}
