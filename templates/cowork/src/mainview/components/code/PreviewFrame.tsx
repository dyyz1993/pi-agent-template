/**
 * 预览渲染层 — Web 端用 iframe，桌面端用占位容器
 */
import { Loader2 } from 'lucide-react';
import type { PreviewTab } from '../../stores/use-preview-store';

interface PreviewFrameProps {
	tab: PreviewTab;
	useIframe: boolean;
}

export function PreviewFrame({ tab, useIframe }: PreviewFrameProps) {
	if (tab.state === 'loading') {
		return (
			<div className="w-full h-full flex items-center justify-center bg-[var(--color-bg-primary)]">
				<div className="text-center">
					<Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-[var(--color-text-accent)]" />
					<p className="text-sm text-[var(--color-text-secondary)]">Loading {tab.url}</p>
				</div>
			</div>
		);
	}

	if (tab.state === 'error') {
		return (
			<div className="w-full h-full flex items-center justify-center bg-[var(--color-bg-primary)]">
				<div className="text-center">
					<p className="text-lg mb-2">⚠️</p>
					<p className="text-sm text-[var(--color-text-secondary)]">Failed to load</p>
					<p className="text-xs text-[var(--color-text-tertiary)] mt-1">{tab.url}</p>
				</div>
			</div>
		);
	}

	if (useIframe) {
		return (
			<iframe
				src={tab.url}
				className="w-full h-full border-0 bg-white"
				title={tab.url}
				sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
			/>
		);
	}

	// 桌面端占位（Phase 2 接原生 webview）
	return (
		<div className="w-full h-full flex items-center justify-center bg-[var(--color-bg-primary)]">
			<div className="text-center">
				<p className="text-sm text-[var(--color-text-secondary)]">{tab.url}</p>
				<p className="text-xs text-[var(--color-text-tertiary)] mt-1">
					Desktop webview placeholder (Phase 2)
				</p>
			</div>
		</div>
	);
}
