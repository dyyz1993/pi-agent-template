/**
 * Preview 模块 — 内嵌浏览器预览（Code Tab）
 *
 * Web 端用 iframe，桌面端用 Electrobun BrowserView（Phase 2）。
 * 后端负责桌面端窗口管理 + URL 加载；Web 端返回 useIframe 信号让前端渲染 iframe。
 */

export type NavState = 'loading' | 'ready' | 'error';

export interface PreviewTab {
	id: string;
	url: string;
	title: string;
	state: NavState;
	canGoBack: boolean;
	canGoForward: boolean;
}

export interface PreviewMethods {
	'preview.open': {
		params: { url: string; tabId?: string };
		result: { tab: PreviewTab; useIframe: boolean };
	};
	'preview.navigate': {
		params: { tabId: string; action: 'back' | 'forward' | 'reload' };
		result: { ok: boolean };
	};
	'preview.close': {
		params: { tabId: string };
		result: { ok: boolean };
	};
	'preview.list': {
		params: Record<string, never>;
		result: { tabs: PreviewTab[] };
	};
	'preview.history': {
		params: Record<string, never>;
		result: { urls: string[] };
	};
}

export interface PreviewEvents {
	'preview.navState': PreviewTab;
}
