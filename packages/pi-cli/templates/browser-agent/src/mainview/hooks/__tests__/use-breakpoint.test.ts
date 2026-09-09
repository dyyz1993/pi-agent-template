import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockSetBreakpoint = vi.fn();
const mockSetPinned = vi.fn();
const mockSetDrawerOpen = vi.fn();
const mockSetAssetsVisible = vi.fn();
const mockSetAssetsDrawerOpen = vi.fn();

vi.mock("../../stores/use-sidebar-store", () => ({
	useSidebarStore: {
		getState: () => ({
			breakpoint: "desktop",
			isPinned: true,
			_setBreakpoint: mockSetBreakpoint,
			setPinned: mockSetPinned,
			setDrawerOpen: mockSetDrawerOpen,
		}),
	},
	useAssetsPanelStore: {
		getState: () => ({
			assetsVisible: true,
			assetsDrawerOpen: false,
			setAssetsVisible: mockSetAssetsVisible,
			setAssetsDrawerOpen: mockSetAssetsDrawerOpen,
		}),
	},
}));

describe("useBreakpointSync", () => {
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
		globalThis.ResizeObserver = MockResizeObserver as any;
	});

	it("should create ResizeObserver and observe documentElement", async () => {
		const { useBreakpointSync } = await import("../../hooks/use-breakpoint");
		renderHook(() => useBreakpointSync());
		expect(mockObserve).toHaveBeenCalledWith(document.documentElement);
	});

	it("should set mobile breakpoint for width < 768", async () => {
		const { useBreakpointSync } = await import("../../hooks/use-breakpoint");
		renderHook(() => useBreakpointSync());

		act(() => {
			observerCallback(
				[
					{
						target: document.documentElement,
						contentRect: { width: 500, height: 800 } as DOMRectReadOnly,
						borderBoxSize: [] as any,
						contentBoxSize: [] as any,
					},
				],
				{} as ResizeObserver,
			);
		});

		await new Promise((r) => setTimeout(r, 200));
		expect(mockSetBreakpoint).toHaveBeenCalledWith("mobile");
	});

	it("should set tablet breakpoint for 768 <= width < 1024", async () => {
		const { useBreakpointSync } = await import("../../hooks/use-breakpoint");
		renderHook(() => useBreakpointSync());

		act(() => {
			observerCallback(
				[
					{
						target: document.documentElement,
						contentRect: { width: 900, height: 600 } as DOMRectReadOnly,
						borderBoxSize: [] as any,
						contentBoxSize: [] as any,
					},
				],
				{} as ResizeObserver,
			);
		});

		await new Promise((r) => setTimeout(r, 200));
		expect(mockSetBreakpoint).toHaveBeenCalledWith("tablet");
	});

	it("should set wide breakpoint for width >= 1280", async () => {
		vi.doMock("../../stores/use-sidebar-store", () => ({
			useSidebarStore: {
				getState: () => ({
					breakpoint: "desktop",
					isPinned: true,
					_setBreakpoint: mockSetBreakpoint,
					setPinned: mockSetPinned,
					setDrawerOpen: mockSetDrawerOpen,
				}),
			},
			useAssetsPanelStore: {
				getState: () => ({
					assetsVisible: false,
					assetsDrawerOpen: false,
					setAssetsVisible: mockSetAssetsVisible,
					setAssetsDrawerOpen: mockSetAssetsDrawerOpen,
				}),
			},
		}));

		const { useBreakpointSync } = await import("../../hooks/use-breakpoint");
		renderHook(() => useBreakpointSync());

		act(() => {
			observerCallback(
				[
					{
						target: document.documentElement,
						contentRect: { width: 1400, height: 900 } as DOMRectReadOnly,
						borderBoxSize: [] as any,
						contentBoxSize: [] as any,
					},
				],
				{} as ResizeObserver,
			);
		});

		await new Promise((r) => setTimeout(r, 200));
		expect(mockSetBreakpoint).toHaveBeenCalledWith("wide");
	});

	it("should disconnect observer on unmount", async () => {
		const { useBreakpointSync } = await import("../../hooks/use-breakpoint");
		const { unmount } = renderHook(() => useBreakpointSync());
		unmount();
		expect(mockDisconnect).toHaveBeenCalled();
	});
});
