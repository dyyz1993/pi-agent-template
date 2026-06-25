import { describe, it, expect, vi, beforeEach } from "vitest";

describe("useSidebarStore", () => {
	beforeEach(async () => {
		vi.resetModules();
		localStorage.clear();
	});

	it("should have correct initial state", async () => {
		const { useSidebarStore } = await import("../use-sidebar-store");
		const state = useSidebarStore.getState();
		expect(state.activePanel).toBe("explorer");
		expect(state.drawerOpen).toBe(false);
		expect(state.sidebarWidth).toBeGreaterThanOrEqual(180);
		expect(state.sidebarWidth).toBeLessThanOrEqual(480);
	});

	it("should toggle panel to new panel", async () => {
		const { useSidebarStore } = await import("../use-sidebar-store");
		useSidebarStore.getState().togglePanel("git");

		const state = useSidebarStore.getState();
		expect(state.activePanel).toBe("git");
	});

	it("should toggle panel off when same panel clicked and is pinned", async () => {
		const { useSidebarStore } = await import("../use-sidebar-store");
		useSidebarStore.setState({ activePanel: "explorer", isPinned: true });

		useSidebarStore.getState().togglePanel("explorer");
		expect(useSidebarStore.getState().activePanel).toBeNull();
		expect(useSidebarStore.getState().drawerOpen).toBe(false);
	});

	it("should open drawer when toggling to new panel while not pinned", async () => {
		const { useSidebarStore } = await import("../use-sidebar-store");
		useSidebarStore.setState({ activePanel: "explorer", isPinned: false });

		useSidebarStore.getState().togglePanel("git");
		expect(useSidebarStore.getState().activePanel).toBe("git");
		expect(useSidebarStore.getState().drawerOpen).toBe(true);
	});

	it("should set active panel", async () => {
		const { useSidebarStore } = await import("../use-sidebar-store");
		useSidebarStore.getState().setActivePanel("chat");
		expect(useSidebarStore.getState().activePanel).toBe("chat");
	});

	it("should set active panel to null", async () => {
		const { useSidebarStore } = await import("../use-sidebar-store");
		useSidebarStore.getState().setActivePanel(null);
		expect(useSidebarStore.getState().activePanel).toBeNull();
	});

	it("should set pinned and persist to localStorage", async () => {
		const { useSidebarStore } = await import("../use-sidebar-store");
		useSidebarStore.getState().setPinned(true);
		expect(useSidebarStore.getState().isPinned).toBe(true);
		expect(useSidebarStore.getState().drawerOpen).toBe(false);
		expect(localStorage.getItem("sidebar-pinned")).toBe("true");
	});

	it("should set pinned false and persist", async () => {
		const { useSidebarStore } = await import("../use-sidebar-store");
		useSidebarStore.getState().setPinned(false);
		expect(useSidebarStore.getState().isPinned).toBe(false);
		expect(localStorage.getItem("sidebar-pinned")).toBe("false");
	});

	it("should set drawer open", async () => {
		const { useSidebarStore } = await import("../use-sidebar-store");
		useSidebarStore.getState().setDrawerOpen(true);
		expect(useSidebarStore.getState().drawerOpen).toBe(true);
	});

	it("should close drawer and clear active panel when not pinned", async () => {
		const { useSidebarStore } = await import("../use-sidebar-store");
		useSidebarStore.setState({ isPinned: false, drawerOpen: true, activePanel: "explorer" });

		useSidebarStore.getState().setDrawerOpen(false);
		expect(useSidebarStore.getState().drawerOpen).toBe(false);
		expect(useSidebarStore.getState().activePanel).toBeNull();
	});

	it("should close drawer but keep active panel when pinned", async () => {
		const { useSidebarStore } = await import("../use-sidebar-store");
		useSidebarStore.setState({ isPinned: true, drawerOpen: true, activePanel: "explorer" });

		useSidebarStore.getState().setDrawerOpen(false);
		expect(useSidebarStore.getState().drawerOpen).toBe(false);
		expect(useSidebarStore.getState().activePanel).toBe("explorer");
	});

	it("should set sidebar width and clamp to min", async () => {
		const { useSidebarStore, SIDEBAR_MIN_WIDTH } = await import("../use-sidebar-store");
		useSidebarStore.getState().setSidebarWidth(50);
		expect(useSidebarStore.getState().sidebarWidth).toBe(SIDEBAR_MIN_WIDTH);
	});

	it("should set sidebar width and clamp to max", async () => {
		const { useSidebarStore, SIDEBAR_MAX_WIDTH } = await import("../use-sidebar-store");
		useSidebarStore.getState().setSidebarWidth(999);
		expect(useSidebarStore.getState().sidebarWidth).toBe(SIDEBAR_MAX_WIDTH);
	});

	it("should persist sidebar width to localStorage", async () => {
		const { useSidebarStore } = await import("../use-sidebar-store");
		useSidebarStore.getState().setSidebarWidth(300);
		expect(localStorage.getItem("sidebar-width")).toBe("300");
	});

	it("should set breakpoint", async () => {
		const { useSidebarStore } = await import("../use-sidebar-store");
		useSidebarStore.getState()._setBreakpoint("mobile");
		expect(useSidebarStore.getState().breakpoint).toBe("mobile");
		useSidebarStore.getState()._setBreakpoint("desktop");
		expect(useSidebarStore.getState().breakpoint).toBe("desktop");
	});
});
