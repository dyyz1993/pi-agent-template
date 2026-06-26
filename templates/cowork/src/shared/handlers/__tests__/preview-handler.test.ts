import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RPCServer } from '@dyyz1993/rpc-core';

describe('Preview Handler', () => {
	let registeredHandlers: Record<string, (params: unknown) => Promise<unknown>>;
	let emittedEvents: { event: string; payload: unknown }[];

	beforeEach(async () => {
		vi.resetModules();
		registeredHandlers = {};
		emittedEvents = [];

		const mockServer = {
			register: vi.fn((method: string, handler: Function) => {
				registeredHandlers[method] = handler as (params: unknown) => Promise<unknown>;
			}),
			emitEvent: vi.fn((event: string, payload: unknown) => {
				emittedEvents.push({ event, payload });
			}),
		};

		const { register } = await import('../preview');
		register(mockServer as unknown as RPCServer, { platform: 'web' });
	});

	it('should register all preview methods', () => {
		expect(registeredHandlers['preview.open']).toBeDefined();
		expect(registeredHandlers['preview.navigate']).toBeDefined();
		expect(registeredHandlers['preview.close']).toBeDefined();
		expect(registeredHandlers['preview.list']).toBeDefined();
		expect(registeredHandlers['preview.history']).toBeDefined();
	});

	it('preview.open should return a tab with useIframe=true on web platform', async () => {
		const result = (await registeredHandlers['preview.open']({
			url: 'http://localhost:5173',
		})) as { tab: { id: string; url: string; state: string }; useIframe: boolean };

		expect(result.tab).toBeDefined();
		expect(result.tab.url).toBe('http://localhost:5173');
		expect(result.tab.state).toBe('ready');
		expect(result.useIframe).toBe(true);
		expect(result.tab.id).toMatch(/^preview-/);
	});

	it('preview.open should emit navState event', async () => {
		await registeredHandlers['preview.open']({ url: 'http://localhost:5173' });

		expect(emittedEvents.length).toBeGreaterThan(0);
		expect(emittedEvents[0].event).toBe('preview.navState');
		const payload = emittedEvents[0].payload as { url: string; state: string };
		expect(payload.url).toBe('http://localhost:5173');
	});

	it('preview.open should accept custom tabId', async () => {
		const result = (await registeredHandlers['preview.open']({
			url: 'http://localhost:3000',
			tabId: 'custom-tab-1',
		})) as { tab: { id: string } };

		expect(result.tab.id).toBe('custom-tab-1');
	});

	it('preview.open should record URL in history', async () => {
		await registeredHandlers['preview.open']({ url: 'http://localhost:5173' });
		const historyResult = (await registeredHandlers['preview.history']({})) as {
			urls: string[];
		};
		expect(historyResult.urls).toContain('http://localhost:5173');
	});

	it('preview.navigate should emit loading then ready', async () => {
		const openResult = (await registeredHandlers['preview.open']({
			url: 'http://localhost:5173',
		})) as { tab: { id: string } };
		const tabId = openResult.tab.id;

		emittedEvents.length = 0;
		await registeredHandlers['preview.navigate']({ tabId, action: 'reload' });

		// Should emit loading immediately
		expect(emittedEvents[0].payload).toMatchObject({ state: 'loading' });

		// Wait for setTimeout to fire ready state
		await new Promise((resolve) => setTimeout(resolve, 400));
		const readyEvent = emittedEvents.find(
			(e) => (e.payload as { state: string }).state === 'ready',
		);
		expect(readyEvent).toBeDefined();
	});

	it('preview.navigate should throw for unknown tabId', async () => {
		await expect(
			registeredHandlers['preview.navigate']({ tabId: 'nonexistent', action: 'reload' }),
		).rejects.toThrow('Tab not found');
	});

	it('preview.close should remove the tab', async () => {
		const openResult = (await registeredHandlers['preview.open']({
			url: 'http://localhost:5173',
		})) as { tab: { id: string } };
		const tabId = openResult.tab.id;

		const closeResult = (await registeredHandlers['preview.close']({ tabId })) as {
			ok: boolean;
		};
		expect(closeResult.ok).toBe(true);

		const listResult = (await registeredHandlers['preview.list']({})) as {
			tabs: { id: string }[];
		};
		expect(listResult.tabs.find((t) => t.id === tabId)).toBeUndefined();
	});

	it('preview.list should return all open tabs', async () => {
		await registeredHandlers['preview.open']({ url: 'http://localhost:5173' });
		await registeredHandlers['preview.open']({ url: 'http://localhost:3000' });

		const result = (await registeredHandlers['preview.list']({})) as {
			tabs: { id: string; url: string }[];
		};
		expect(result.tabs).toHaveLength(2);
	});

	it('preview.history should not exceed 20 entries', async () => {
		for (let i = 0; i < 25; i++) {
			await registeredHandlers['preview.open']({ url: `http://localhost:${3000 + i}` });
		}
		const result = (await registeredHandlers['preview.history']({})) as {
			urls: string[];
		};
		expect(result.urls.length).toBeLessThanOrEqual(20);
	});

	it('preview.history should deduplicate URLs', async () => {
		await registeredHandlers['preview.open']({ url: 'http://localhost:5173' });
		await registeredHandlers['preview.open']({ url: 'http://localhost:5173' });
		await registeredHandlers['preview.open']({ url: 'http://localhost:5173' });

		const result = (await registeredHandlers['preview.history']({})) as {
			urls: string[];
		};
		expect(result.urls.filter((u) => u === 'http://localhost:5173')).toHaveLength(1);
	});
});

describe('Preview Handler (Desktop Platform)', () => {
	let registeredHandlers: Record<string, (params: unknown) => Promise<unknown>>;

	beforeEach(async () => {
		vi.resetModules();
		registeredHandlers = {};

		const mockServer = {
			register: vi.fn((method: string, handler: Function) => {
				registeredHandlers[method] = handler as (params: unknown) => Promise<unknown>;
			}),
			emitEvent: vi.fn(),
		};

		const { register } = await import('../preview');
		register(mockServer as unknown as RPCServer, { platform: 'desktop' });
	});

	it('preview.open should return useIframe=false on desktop platform', async () => {
		const result = (await registeredHandlers['preview.open']({
			url: 'http://localhost:5173',
		})) as { useIframe: boolean };

		expect(result.useIframe).toBe(false);
	});
});
