/**
 * 右侧预览区块 — 浏览器预览 + 地址栏 + 元素选择器
 *
 * 两种使用场景：
 * - Code Tab 主内容：自带的标题栏 + 关闭（closeTab）
 * - 聊天链接展开预览：由父级传入 onClose（closePreview），复用同一套 UI
 */
import { useRef, useCallback, useState } from 'react';
import { Globe, X, ArrowLeft, RotateCw, Loader2 } from 'lucide-react';
import { usePreviewStore } from '../../stores/use-preview-store';
import { ElementPicker } from './ElementPicker';

interface PreviewBlockProps {
	/** 关闭按钮回调；未传则使用 store 的 closeTab（Code Tab 场景） */
	onClose?: () => void;
}

export function PreviewBlock({ onClose }: PreviewBlockProps) {
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

	const handleClose = onClose ?? closeTab;

	// 加载中且尚无 tab：显示加载态，避免空状态文案误闪
	if (!currentTab && navState === 'loading') {
		return (
			<div className="flex-1 flex flex-col">
				<div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--color-border-secondary)]">
					<span className="text-sm font-semibold text-[var(--color-text-primary)]">Preview</span>
					{onClose && (
						<button
							onClick={handleClose}
							title="关闭预览"
							className="p-1 rounded hover:bg-[var(--color-bg-hover)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
						>
							<X className="w-4 h-4" />
						</button>
					)}
				</div>
				<div className="flex-1 flex items-center justify-center">
					<Loader2 className="w-5 h-5 animate-spin text-[var(--color-text-tertiary)]" />
				</div>
			</div>
		);
	}

	// 空状态：提示用户从聊天中点击 localhost 链接打开预览
	if (!currentTab) {
		return (
			<div className="flex-1 flex flex-col">
				<div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--color-border-secondary)]">
					<span className="text-sm font-semibold text-[var(--color-text-primary)]">Preview</span>
					{onClose && (
						<button
							onClick={handleClose}
							title="关闭预览"
							className="p-1 rounded hover:bg-[var(--color-bg-hover)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
						>
							<X className="w-4 h-4" />
						</button>
					)}
				</div>
				<div className="flex-1 flex items-center justify-center px-4">
					<div className="text-center w-full">
						<div className="w-12 h-12 rounded-xl bg-[var(--color-bg-tertiary)] flex items-center justify-center mx-auto mb-3">
							<Globe className="w-6 h-6 text-[var(--color-text-tertiary)]" />
						</div>
						<p className="text-sm text-[var(--color-text-secondary)] mb-1">暂无预览</p>
						<p className="text-xs text-[var(--color-text-tertiary)] leading-relaxed">
							当聊天中出现 localhost 链接时，点击即可在此打开预览。
						</p>
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
					onClick={handleClose}
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
