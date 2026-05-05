import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";

const mockTogglePanel = vi.fn();

vi.mock("../../../stores/use-sidebar-store", () => ({
  useSidebarStore: (selector: any) =>
    selector({ activePanel: "explorer", togglePanel: mockTogglePanel }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

describe("ActivityBar", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("should render all activity bar buttons", async () => {
    const { ActivityBar } = await import("../ActivityBar");
    render(<ActivityBar />);
    expect(screen.getByTitle("sidebar.explorer")).toBeDefined();
    expect(screen.getByTitle("sidebar.git")).toBeDefined();
    expect(screen.getByTitle("sidebar.search")).toBeDefined();
    expect(screen.getByTitle("sidebar.rules")).toBeDefined();
  });

  it("should call togglePanel on button click", async () => {
    const { ActivityBar } = await import("../ActivityBar");
    render(<ActivityBar />);
    fireEvent.click(screen.getByTitle("sidebar.git"));
    expect(mockTogglePanel).toHaveBeenCalledWith("git");
  });

  it("should highlight active panel button", async () => {
    const { ActivityBar } = await import("../ActivityBar");
    const { container } = render(<ActivityBar />);
    const activeBtn = screen.getByTitle("sidebar.explorer").closest("button");
    expect(activeBtn?.className).toContain("border-l-2");
  });
});
