import { describe, it, expect, beforeEach, vi } from "vitest";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

describe("useSidebarStore", () => {
  beforeEach(async () => {
    vi.resetModules();
    localStorageMock.clear();
  });

  it("should have correct initial state", async () => {
    const { useSidebarStore } = await import("../../stores/use-sidebar-store");
    const state = useSidebarStore.getState();
    expect(state.activePanel).toBeNull();
    expect(state.drawerOpen).toBe(false);
  });

  it("should set active panel", async () => {
    const { useSidebarStore } = await import("../../stores/use-sidebar-store");
    useSidebarStore.getState().setActivePanel(null);
    expect(useSidebarStore.getState().activePanel).toBeNull();
  });

  it("should set pinned state", async () => {
    const { useSidebarStore } = await import("../../stores/use-sidebar-store");
    useSidebarStore.getState().setPinned(true);
    expect(useSidebarStore.getState().isPinned).toBe(true);
    expect(localStorageMock.getItem("sidebar-pinned")).toBe("true");
  });

  it("should unpin and close drawer", async () => {
    const { useSidebarStore } = await import("../../stores/use-sidebar-store");
    useSidebarStore.getState().setPinned(true);
    useSidebarStore.getState().setPinned(false);
    expect(useSidebarStore.getState().isPinned).toBe(false);
    expect(useSidebarStore.getState().drawerOpen).toBe(false);
  });

  it("should set drawer open", async () => {
    const { useSidebarStore } = await import("../../stores/use-sidebar-store");
    useSidebarStore.getState().setDrawerOpen(true);
    expect(useSidebarStore.getState().drawerOpen).toBe(true);
  });

  it("should close drawer and clear panel when unpinned", async () => {
    const { useSidebarStore } = await import("../../stores/use-sidebar-store");
    useSidebarStore.getState().setPinned(false);
    useSidebarStore.getState().setDrawerOpen(true);
    useSidebarStore.getState().setDrawerOpen(false);
    expect(useSidebarStore.getState().drawerOpen).toBe(false);
    expect(useSidebarStore.getState().activePanel).toBeNull();
  });

  it("should clamp sidebar width within bounds", async () => {
    const { useSidebarStore, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH } = await import("../../stores/use-sidebar-store");
    useSidebarStore.getState().setSidebarWidth(50);
    expect(useSidebarStore.getState().sidebarWidth).toBe(SIDEBAR_MIN_WIDTH);

    useSidebarStore.getState().setSidebarWidth(999);
    expect(useSidebarStore.getState().sidebarWidth).toBe(SIDEBAR_MAX_WIDTH);

    useSidebarStore.getState().setSidebarWidth(300);
    expect(useSidebarStore.getState().sidebarWidth).toBe(300);
  });

  it("should persist sidebar width to localStorage", async () => {
    const { useSidebarStore } = await import("../../stores/use-sidebar-store");
    useSidebarStore.getState().setSidebarWidth(300);
    expect(localStorageMock.getItem("sidebar-width")).toBe("300");
  });

  it("should set breakpoint", async () => {
    const { useSidebarStore } = await import("../../stores/use-sidebar-store");
    useSidebarStore.getState()._setBreakpoint("mobile");
    expect(useSidebarStore.getState().breakpoint).toBe("mobile");
    useSidebarStore.getState()._setBreakpoint("desktop");
    expect(useSidebarStore.getState().breakpoint).toBe("desktop");
  });
});
