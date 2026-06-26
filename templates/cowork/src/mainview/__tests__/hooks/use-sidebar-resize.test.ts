import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSidebarStore } from "../../stores/use-sidebar-store";

describe("useSidebarResize", () => {
  beforeEach(() => {
    act(() => {
      useSidebarStore.setState({
        sidebarWidth: 280,
        isPinned: true,
        activePanel: "explorer",
        breakpoint: "desktop",
        drawerOpen: false,
      });
    });
  });

  it("should return current sidebar width", async () => {
    const { useSidebarResize } = await import("../../hooks/use-sidebar-resize");
    const { result } = renderHook(() => useSidebarResize());
    expect(result.current.sidebarWidth).toBe(280);
  });

  it("should provide handleResizeStart function", async () => {
    const { useSidebarResize } = await import("../../hooks/use-sidebar-resize");
    const { result } = renderHook(() => useSidebarResize());
    expect(typeof result.current.handleResizeStart).toBe("function");
  });

  it("should update width on mouse drag", async () => {
    const { useSidebarResize } = await import("../../hooks/use-sidebar-resize");
    const { result } = renderHook(() => useSidebarResize());

    const mouseDownEvent = new MouseEvent("mousedown", {
      clientX: 280,
      bubbles: true,
    });
    Object.defineProperty(mouseDownEvent, "preventDefault", {
      value: vi.fn(),
    });

    act(() => {
      result.current.handleResizeStart(mouseDownEvent);
    });

    const moveEvent = new MouseEvent("mousemove", {
      clientX: 330,
      bubbles: true,
    });

    act(() => {
      window.dispatchEvent(moveEvent);
    });

    expect(useSidebarStore.getState().sidebarWidth).toBe(330);

    const upEvent = new MouseEvent("mouseup");
    act(() => {
      window.dispatchEvent(upEvent);
    });
  });

  it("should clean up cursor and listeners on mouseup", async () => {
    const { useSidebarResize } = await import("../../hooks/use-sidebar-resize");
    const { result } = renderHook(() => useSidebarResize());

    const mouseDownEvent = new MouseEvent("mousedown", {
      clientX: 280,
      bubbles: true,
    });
    Object.defineProperty(mouseDownEvent, "preventDefault", {
      value: vi.fn(),
    });

    act(() => {
      result.current.handleResizeStart(mouseDownEvent);
    });

    expect(document.body.style.cursor).toBe("col-resize");
    expect(document.body.style.userSelect).toBe("none");

    const upEvent = new MouseEvent("mouseup");
    act(() => {
      window.dispatchEvent(upEvent);
    });

    expect(document.body.style.cursor).toBe("");
    expect(document.body.style.userSelect).toBe("");
  });

  it("should clamp width to min/max bounds", async () => {
    act(() => {
      useSidebarStore.setState({ sidebarWidth: 200 });
    });

    const { useSidebarResize } = await import("../../hooks/use-sidebar-resize");
    const { result } = renderHook(() => useSidebarResize());

    const mouseDownEvent = new MouseEvent("mousedown", {
      clientX: 200,
      bubbles: true,
    });
    Object.defineProperty(mouseDownEvent, "preventDefault", {
      value: vi.fn(),
    });

    act(() => {
      result.current.handleResizeStart(mouseDownEvent);
    });

    const moveEvent = new MouseEvent("mousemove", {
      clientX: 0,
      bubbles: true,
    });

    act(() => {
      window.dispatchEvent(moveEvent);
    });

    expect(useSidebarStore.getState().sidebarWidth).toBeGreaterThanOrEqual(180);

    const upEvent = new MouseEvent("mouseup");
    act(() => {
      window.dispatchEvent(upEvent);
    });
  });
});
