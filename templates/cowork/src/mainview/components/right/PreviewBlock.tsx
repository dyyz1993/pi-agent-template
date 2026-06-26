/**
 * 右侧预览区块 — 在右侧边栏嵌入浏览器预览 + 元素选择器
 *
 * 仅在 Code Tab 下显示，有活跃标签时渲染 iframe。
 * 包含元素选择工具，用户可选取页面元素提取 CSS selector。
 */
import { useRef, useCallback } from 'react';
import { Globe, X } from 'lucide-react';
import { usePreviewStore } from '../../stores/use-preview-store';
import { ElementPicker } from './ElementPicker';
import { useViewStore } from '../../stores/use-view-store';

export function PreviewBlock() {
	const currentTab = usePreviewStore((s) => s.currentTab);
	const closeTab = usePreviewStore((s) => s.closeTab);
	const centerTab = useViewStore((s) => s.centerTab);
	const iframeRef = useRef<HTMLIFrameElement | null>(null);

	const isCodeTab = centerTab === 'code';

	const handleElementSelected = useCallback((selector: string, tagName: string) => {
		// 将选择器写入剪贴板 + 控制台提示
		console.warn(`[ElementPicker] Selected ${tagName}: ${selector}`);
	}, []);

	// 非 Code 模式或无标签时不显示
	if (!isCodeTab || !currentTab) return null;

	return (
		<div className="flex flex-col h-full border-t border-[var(--color-border-secondary)]">
			{/* 标题栏 */}
			<div className="flex items-center justify-between px-3 py-2">
				<div className="flex items-center gap-2 min-w-0">
					<Globe className="w-3.5 h-3.5 text-[var(--color-text-accent)] flex-shrink-0" />
					<span className="text-xs font-medium text-[var(--color-text-primary)] truncate">
						Preview
					</span>
				</div>
				<button
					onClick={closeTab}
					className="p-1 rounded hover:bg-[var(--color-bg-hover)] transition-colors text-[var(--color-text-tertiary)]"
					title="关闭预览"
				>
					<X className="w-3 h-3" />
				</button>
			</div>

			{/* URL 路径 */}
			<div className="px-3 pb-2">
				<div className="px-2 py-1 rounded bg-[var(--color-bg-tertiary)] text-[10px] font-mono text-[var(--color-text-tertiary)] truncate">
					{currentTab.url}
				</div>
			</div>

			{/* iframe 浏览器 */}
			<div className="flex-1 min-h-[200px] overflow-hidden bg-white mx-3 rounded-lg border border-[var(--color-border-primary)]">
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
