/**
 * 右侧预览区块 — 浏览器预览 + 地址栏 + 元素选择器
 *
 * Code Tab 下的右栏主内容。
 * 包含 URL 地址栏、iframe 渲染、元素选取工具。
 */
import { useRef, useCallback, useState } from 'react';
import { Globe, X, ArrowLeft, RotateCw, Loader2 } from 'lucide-react';
import { usePreviewStore } from '../../stores/use-preview-store';
import { ElementPicker } from './ElementPicker';

export function PreviewBlock() {
	const currentTab = usePreviewStore((s) => s.currentTab);
	const closeTab = usePreviewStore((s) => s.closeTab);
	const openUrl = usePreviewStore((s) => s.openUrl);
	const navigate = usePreviewStore((s) => s.navigate);
	const navState = usePreviewStore((s) => s.navState);
	const iframeRef = useRef<HTMLIFrameElement | null>(null);
	const [urlInput, setUrlInput] = useState(currentTab?.url ?? '');

	const handleElementSelected = useCallback((selector: string, tagName: string) => {
		console.warn(`[ElementPicker] Selected ${tagName}: ${selector}`);
	}, []);

	const handleUrlSubmit = useCallback(() => {
		if (urlInput.trim()) openUrl(urlInput.trim());
	}, [urlInput, openUrl]);

	// 空状态：没有打开的标签
	if (!currentTab) {
		return (
			<div className="flex-1 flex flex-col">
				<div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--color-border-secondary)]">
					<span className="text-sm font-semibold text-[var(--color-text-primary)]">Preview</span>
				</div>
				<div className="flex-1 flex items-center justify-center px-4">
					<div className="text-center w-full">
						<div className="w-12 h-12 rounded-xl bg-[var(--color-bg-tertiary)] flex items-center justify-center mx-auto mb-3">
							<Globe className="w-6 h-6 text-[var(--color-text-tertiary)]" />
						</div>
						<p className="text-sm text-[var(--color-text-secondary)] mb-3">输入 URL 预览</p>
						<input
							value={urlInput}
							onChange={(e) => setUrlInput(e.target.value)}
							onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
							placeholder="localhost:5173"
							className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-xs font-mono text-[var(--color-text-primary)] placeholder:text-[var(--color-text-placeholder)] focus:border-[var(--color-text-accent)] outline-none transition-colors"
						/>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full">
			{/* 标题栏 */}
			<div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border-secondary)]">
				<div className="flex items-center gap-2 min-w-0">
					<Globe className="w-3.5 h-3.5 text-[var(--color-text-accent)] flex-shrink-0" />
					<span className="text-sm font-semibold text-[var(--color-text-primary)]">Preview</span>
				</div>
				<button
					onClick={closeTab}
					className="p-1 rounded hover:bg-[var(--color-bg-hover)] transition-colors text-[var(--color-text-tertiary)]"
					title="关闭预览"
				>
					<X className="w-3.5 h-3.5" />
				</button>
			</div>

			{/* 地址栏 */}
			<div className="flex items-center gap-1 px-2 py-1.5 border-b border-[var(--color-border-secondary)]">
				<button
					onClick={() => navigate('back')}
					disabled={!currentTab.canGoBack}
					className="p-1 rounded hover:bg-[var(--color-bg-hover)] disabled:opacity-30 transition-colors text-[var(--color-text-tertiary)]"
				>
					<ArrowLeft className="w-3.5 h-3.5" />
				</button>
				<button
					onClick={() => navigate('reload')}
					className="p-1 rounded hover:bg-[var(--color-bg-hover)] transition-colors text-[var(--color-text-tertiary)]"
				>
					{navState === 'loading' ? (
						<Loader2 className="w-3.5 h-3.5 animate-spin" />
					) : (
						<RotateCw className="w-3.5 h-3.5" />
					)}
				</button>
				<input
					value={urlInput || currentTab.url}
					onChange={(e) => setUrlInput(e.target.value)}
					onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
					placeholder="URL"
					className="flex-1 min-w-0 px-2 py-1 rounded bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[11px] font-mono text-[var(--color-text-primary)] focus:border-[var(--color-text-accent)] outline-none transition-colors"
				/>
			</div>

			{/* iframe 浏览器 */}
			<div className="flex-1 min-h-[150px] overflow-hidden bg-white mx-3 my-2 rounded-lg border border-[var(--color-border-primary)]">
				<iframe
					ref={iframeRef}
					src={currentTab.url}
					className="w-full h-full border-0"
					title={currentTab.url}
					sandbox="allow-scripts allow-same-origin allow-forms"
				/>
			</div>

			{/* 元素选择器 */}
			<ElementPicker
				iframeRef={iframeRef}
				onElementSelected={handleElementSelected}
				enabled={true}
			/>
		</div>
	);
}
