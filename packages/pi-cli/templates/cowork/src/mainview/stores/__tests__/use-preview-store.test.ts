import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock apiClient before importing store
vi.mock('../../lib/api-client', () => ({
	apiClient: {
		call: vi.fn(),
		subscribe: vi.fn().mockResolvedValue('mock-sub-id'),
		unsubscribe: vi.fn(),
	},
}));

vi.mock('../../stores/use-log-store', () => ({
	useLogStore: {
		getState: () => ({ addLog: vi.fn() }),
	},
}));

describe('usePreviewStore', () => {
	beforeEach(async () => {
		vi.resetModules();
		vi.clearAllMocks();
		const { apiClient } = await import('../../lib/api-client');
		(apiClient.call as ReturnType<typeof vi.fn>).mockReset();
		(apiClient.subscribe as ReturnType<typeof vi.fn>).mockReset().mockResolvedValue('mock-sub-id');
	});

	it('should have initial idle state', async () => {
		const { usePreviewStore } = await import('../use-preview-store');
		const state = usePreviewStore.getState();
		expect(state.currentTab).toBeNull();
		expect(state.navState).toBe('idle');
		expect(state.useIframe).toBe(true);
		expect(state.history).toEqual([]);
	});

	it('openUrl should prepend http:// if missing', async () => {
		const { usePreviewStore } = await import('../use-preview-store');
		const { apiClient } = await import('../../lib/api-client');
		const mockTab = {
			id: 'tab-1',
			url: 'http://localhost:5173',
			title: 'test',
			state: 'ready',
			canGoBack: false,
			canGoForward: false,
		};
		(apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValue({
			tab: mockTab,
			useIframe: true,
		});

		await usePreviewStore.getState().openUrl('localhost:5173');

		expect(apiClient.call).toHaveBeenCalledWith('preview.open', {
			url: 'http://localhost:5173',
		});
		expect(usePreviewStore.getState().currentTab?.url).toBe('http://localhost:5173');
		expect(usePreviewStore.getState().navState).toBe('ready');
	});

	it('openUrl should not modify URL if already has protocol', async () => {
		const { usePreviewStore } = await import('../use-preview-store');
		const { apiClient } = await import('../../lib/api-client');
		const mockTab = {
			id: 'tab-1',
			url: 'https://example.com',
			title: 'test',
			state: 'ready',
			canGoBack: false,
			canGoForward: false,
		};
		(apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValue({
			tab: mockTab,
			useIframe: true,
		});

		await usePreviewStore.getState().openUrl('https://example.com');

		expect(apiClient.call).toHaveBeenCalledWith('preview.open', {
			url: 'https://example.com',
		});
	});

	it('openUrl should set error state on failure', async () => {
		const { usePreviewStore } = await import('../use-preview-store');
		const { apiClient } = await import('../../lib/api-client');
		(apiClient.call as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

		await usePreviewStore.getState().openUrl('http://localhost:5173');

		expect(usePreviewStore.getState().navState).toBe('error');
		expect(usePreviewStore.getState().currentTab).toBeNull();
	});

	it('openUrl should subscribe to navState events', async () => {
		const { usePreviewStore } = await import('../use-preview-store');
		const { apiClient } = await import('../../lib/api-client');
		const mockTab = {
			id: 'tab-1',
			url: 'http://localhost:5173',
			title: 'test',
			state: 'ready',
			canGoBack: false,
			canGoForward: false,
		};
		(apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValue({
			tab: mockTab,
			useIframe: true,
		});

		await usePreviewStore.getState().openUrl('http://localhost:5173');

		expect(apiClient.subscribe).toHaveBeenCalledWith('preview.navState', expect.any(Function), {});
	});

	it('navigate should do nothing without currentTab', async () => {
		const { usePreviewStore } = await import('../use-preview-store');
		const { apiClient } = await import('../../lib/api-client');

		await usePreviewStore.getState().navigate('reload');

		expect(apiClient.call).not.toHaveBeenCalled();
	});

	it('navigate should call preview.navigate with tabId and action', async () => {
		const { usePreviewStore } = await import('../use-preview-store');
		const { apiClient } = await import('../../lib/api-client');
		const mockTab = {
			id: 'tab-1',
			url: 'http://localhost:5173',
			title: 'test',
			state: 'ready',
			canGoBack: false,
			canGoForward: false,
		};
		(apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValue({
			tab: mockTab,
			useIframe: true,
		});

		// First open a URL to set currentTab
		await usePreviewStore.getState().openUrl('http://localhost:5173');
		(apiClient.call as ReturnType<typeof vi.fn>).mockClear();

		await usePreviewStore.getState().navigate('reload');

		expect(apiClient.call).toHaveBeenCalledWith('preview.navigate', {
			tabId: 'tab-1',
			action: 'reload',
		});
	});

	it('closeTab should clear currentTab and navState', async () => {
		const { usePreviewStore } = await import('../use-preview-store');
		const { apiClient } = await import('../../lib/api-client');
		const mockTab = {
			id: 'tab-1',
			url: 'http://localhost:5173',
			title: 'test',
			state: 'ready',
			canGoBack: false,
			canGoForward: false,
		};
		(apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValue({
			tab: mockTab,
			useIframe: true,
		});

		await usePreviewStore.getState().openUrl('http://localhost:5173');
		expect(usePreviewStore.getState().currentTab).not.toBeNull();

		(apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
		await usePreviewStore.getState().closeTab();

		expect(usePreviewStore.getState().currentTab).toBeNull();
		expect(usePreviewStore.getState().navState).toBe('idle');
	});

	it('loadHistory should populate history from API', async () => {
		const { usePreviewStore } = await import('../use-preview-store');
		const { apiClient } = await import('../../lib/api-client');
		(apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValue({
			urls: ['http://localhost:5173', 'http://localhost:3000'],
		});

		await usePreviewStore.getState().loadHistory();

		expect(usePreviewStore.getState().history).toEqual([
			'http://localhost:5173',
			'http://localhost:3000',
		]);
	});
});
