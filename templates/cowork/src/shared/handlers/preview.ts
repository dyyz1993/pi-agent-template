import type { RPCServer } from '@dyyz1993/rpc-core';
import type { MethodParams, MethodResult } from '@dyyz1993/rpc-core';
import type { RPCMethods, HandlerOptions } from '../rpc-schema';
import type { PreviewTab } from '../modules/preview';

type RegisterFn = <K extends keyof RPCMethods & string>(
	method: K,
	handler: (params: MethodParams<RPCMethods, K>) => Promise<MethodResult<RPCMethods, K>>,
) => void;

// 内存存储
const tabs = new Map<string, PreviewTab>();
const history: string[] = [];
const MAX_HISTORY = 20;

export function register(server: RPCServer, options: HandlerOptions): void {
	const isDesktop = options.platform === 'desktop';
	const r: RegisterFn = (method, handler) => {
		server.register(method, handler as (params: unknown) => Promise<unknown>);
	};

	r('preview.open', async (params) => {
		let tabId =
			params.tabId ??
			`preview-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
		// Ensure unique tabId
		while (tabs.has(tabId)) {
			tabId = `preview-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
		}

		const tab: PreviewTab = {
			id: tabId,
			url: params.url,
			title: params.url,
			state: 'loading',
			canGoBack: false,
			canGoForward: false,
		};
		tabs.set(tabId, tab);

		// 记录历史（去重，保持最新 20 条）
		if (!history.includes(params.url)) {
			history.unshift(params.url);
			if (history.length > MAX_HISTORY) history.pop();
		}

		// 模拟加载过程（MVP 阶段先用 iframe 兜底）
		tab.state = 'ready';
		server.emitEvent('preview.navState', tab);
		return { tab, useIframe: !isDesktop };
	});

	r('preview.navigate', async (params) => {
		const tab = tabs.get(params.tabId);
		if (!tab) throw new Error(`Tab not found: ${params.tabId}`);

		tab.state = 'loading';
		server.emitEvent('preview.navState', tab);

		// 模拟导航完成
		setTimeout(() => {
			tab.state = 'ready';
			server.emitEvent('preview.navState', tab);
		}, 300);

		return { ok: true };
	});

	r('preview.close', async (params) => {
		tabs.delete(params.tabId);
		return { ok: true };
	});

	r('preview.list', async () => ({
		tabs: [...tabs.values()],
	}));

	r('preview.history', async () => ({
		urls: [...history],
	}));
}
