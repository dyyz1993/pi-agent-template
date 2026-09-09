import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";

const mockTogglePanel = vi.fn();

vi.mock("../../../stores/use-sidebar-store", () => ({
  useSidebarStore: (selector: any) =>
    selector({ activePanel: null, togglePanel: mockTogglePanel }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

describe("MobileTabBar", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("should render all tab buttons", async () => {
    const { MobileTabBar } = await import("../MobileTabBar");
    render(<MobileTabBar />);
    expect(screen.getByText("sidebar.explorer")).toBeDefined();
    expect(screen.getByText("sidebar.git")).toBeDefined();
    expect(screen.getByText("sidebar.search")).toBeDefined();
    expect(screen.getByText("sidebar.rules")).toBeDefined();
  });

  it("should call togglePanel on tab click", async () => {
    const { MobileTabBar } = await import("../MobileTabBar");
    render(<MobileTabBar />);
    fireEvent.click(screen.getByText("sidebar.search"));
    expect(mockTogglePanel).toHaveBeenCalledWith("search");
  });

  it("should render 4 tab buttons", async () => {
    const { MobileTabBar } = await import("../MobileTabBar");
    render(<MobileTabBar />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBe(4);
  });
});
