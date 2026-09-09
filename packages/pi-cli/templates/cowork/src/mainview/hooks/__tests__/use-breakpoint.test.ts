import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockSetBreakpoint = vi.fn();
const mockSetRightMode = vi.fn();

vi.mock('../../stores/use-sidebar-store', () => ({
	useSidebarStore: {
		getState: () => ({
			breakpoint: 'desktop',
			_setBreakpoint: mockSetBreakpoint,
		}),
	},
	useRightPanelStore: {
		getState: () => ({
			mode: 'full',
			setMode: mockSetRightMode,
		}),
	},
}));

describe('useBreakpointSync', () => {
	let observerCallback: ResizeObserverCallback;
	let mockObserve: ReturnType<typeof vi.fn>;
	let mockDisconnect: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();

		mockObserve = vi.fn();
		mockDisconnect = vi.fn();

		class MockResizeObserver {
			constructor(cb: ResizeObserverCallback) {
				observerCallback = cb;
			}
			observe = mockObserve;
			disconnect = mockDisconnect;
			unobserve = vi.fn();
		}
		globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
	});

	it('should create ResizeObserver and observe documentElement', async () => {
		const { useBreakpointSync } = await import('../../hooks/use-breakpoint');
		renderHook(() => useBreakpointSync());
		expect(mockObserve).toHaveBeenCalledWith(document.documentElement);
	});

	it('should set mobile breakpoint for width < 768', async () => {
		const { useBreakpointSync } = await import('../../hooks/use-breakpoint');
		renderHook(() => useBreakpointSync());

		act(() => {
			observerCallback(
				[
					{
						target: document.documentElement,
						contentRect: { width: 500, height: 800 } as DOMRectReadOnly,
						borderBoxSize: [] as unknown,
						contentBoxSize: [] as unknown,
					},
				],
				{} as ResizeObserver,
			);
		});

		await new Promise((r) => setTimeout(r, 200));
		expect(mockSetBreakpoint).toHaveBeenCalledWith('mobile');
	});

	it('should set tablet breakpoint for 768 <= width < 1024', async () => {
		const { useBreakpointSync } = await import('../../hooks/use-breakpoint');
		renderHook(() => useBreakpointSync());

		act(() => {
			observerCallback(
				[
					{
						target: document.documentElement,
						contentRect: { width: 900, height: 600 } as DOMRectReadOnly,
						borderBoxSize: [] as unknown,
						contentBoxSize: [] as unknown,
					},
				],
				{} as ResizeObserver,
			);
		});

		await new Promise((r) => setTimeout(r, 200));
		expect(mockSetBreakpoint).toHaveBeenCalledWith('tablet');
	});

	it('should set wide breakpoint for width >= 1280', async () => {
		const { useBreakpointSync } = await import('../../hooks/use-breakpoint');
		renderHook(() => useBreakpointSync());

		act(() => {
			observerCallback(
				[
					{
						target: document.documentElement,
						contentRect: { width: 1400, height: 900 } as DOMRectReadOnly,
						borderBoxSize: [] as unknown,
						contentBoxSize: [] as unknown,
					},
				],
				{} as ResizeObserver,
			);
		});

		await new Promise((r) => setTimeout(r, 200));
		expect(mockSetBreakpoint).toHaveBeenCalledWith('wide');
	});

	it('should disconnect observer on unmount', async () => {
		const { useBreakpointSync } = await import('../../hooks/use-breakpoint');
		const { unmount } = renderHook(() => useBreakpointSync());
		unmount();
		expect(mockDisconnect).toHaveBeenCalled();
	});
});
