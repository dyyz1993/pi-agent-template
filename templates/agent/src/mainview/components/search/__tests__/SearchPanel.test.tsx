import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

vi.mock("../../../stores/use-explorer-store", () => ({
  useExplorerStore: (selector: any) =>
    selector({ currentPath: "/project" }),
}));

vi.mock("../../../lib/api-client", () => ({
  apiClient: { call: vi.fn() },
}));

describe("SearchPanel", () => {
  afterEach(cleanup);

  it("should render search header", async () => {
    const { SearchPanel } = await import("../SearchPanel");
    render(<SearchPanel />);
    expect(screen.getByText("Search")).toBeDefined();
  });

  it("should render search input", async () => {
    const { SearchPanel } = await import("../SearchPanel");
    render(<SearchPanel />);
    expect(screen.getByPlaceholderText("Search in files...")).toBeDefined();
  });

  it("should render keyboard shortcut hint", async () => {
    const { SearchPanel } = await import("../SearchPanel");
    render(<SearchPanel />);
    const kbd = document.querySelector("kbd");
    expect(kbd).not.toBeNull();
    expect(kbd?.textContent).toMatch(/[⌘Ctrl]/);
  });

  it("should render toggle buttons for case/word/regex", async () => {
    const { SearchPanel } = await import("../SearchPanel");
    render(<SearchPanel />);
    expect(screen.getByTitle("Match Case")).toBeDefined();
    expect(screen.getByTitle("Match Whole Word")).toBeDefined();
    expect(screen.getByTitle("Use Regular Expression")).toBeDefined();
  });

  it("should show initial empty state before search", async () => {
    const { SearchPanel } = await import("../SearchPanel");
    render(<SearchPanel />);
    expect(screen.getByText("Type a search term and press Enter")).toBeDefined();
  });
});
