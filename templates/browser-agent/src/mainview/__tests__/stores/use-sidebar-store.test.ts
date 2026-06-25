import { describe, it, expect, beforeEach } from "vitest";
import { useSidebarStore, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH } from "../../stores/use-sidebar-store";
import { act } from "@testing-library/react";

describe("useSidebarStore", () => {
  beforeEach(() => {
    act(() => {
      useSidebarStore.setState({
        isPinned: true,
        drawerOpen: false,
        sidebarWidth: 240,
        breakpoint: "desktop",
      });
    });
  });

  it("setPinned", () => {
    act(() => {
      useSidebarStore.getState().setPinned(false);
    });
    expect(useSidebarStore.getState().isPinned).toBe(false);
  });

  it("setDrawerOpen", () => {
    act(() => {
      useSidebarStore.getState().setDrawerOpen(true);
    });
    expect(useSidebarStore.getState().drawerOpen).toBe(true);
  });

  it("setDrawerOpen false closes drawer", () => {
    act(() => {
      useSidebarStore.setState({ isPinned: false, drawerOpen: true });
    });
    act(() => {
      useSidebarStore.getState().setDrawerOpen(false);
    });
    expect(useSidebarStore.getState().drawerOpen).toBe(false);
  });

  it("setSidebarWidth clamps to min", () => {
    act(() => {
      useSidebarStore.getState().setSidebarWidth(50);
    });
    expect(useSidebarStore.getState().sidebarWidth).toBe(SIDEBAR_MIN_WIDTH);
  });

  it("setSidebarWidth clamps to max", () => {
    act(() => {
      useSidebarStore.getState().setSidebarWidth(9999);
    });
    expect(useSidebarStore.getState().sidebarWidth).toBe(SIDEBAR_MAX_WIDTH);
  });

  it("_setBreakpoint", () => {
    act(() => {
      useSidebarStore.getState()._setBreakpoint("mobile");
    });
    expect(useSidebarStore.getState().breakpoint).toBe("mobile");
  });
});
