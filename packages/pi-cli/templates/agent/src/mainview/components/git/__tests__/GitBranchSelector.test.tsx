import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";

const mockCheckout = vi.fn();
const mockFetchBranches = vi.fn();

vi.mock("../../../stores/use-git-store", () => ({
  useGitStore: (selector: any) =>
    selector({
      branches: [
        { name: "main", isCurrent: true, isRemote: false },
        { name: "dev", isCurrent: false, isRemote: false },
        { name: "origin/feat", isCurrent: false, isRemote: true },
      ],
      loadingBranches: false,
      loadingAction: null,
      fetchBranches: mockFetchBranches,
      checkout: mockCheckout,
    }),
}));

vi.mock("../../../stores/use-explorer-store", () => ({
  useExplorerStore: (selector: any) => selector({ currentPath: "/project" }),
}));

describe("GitBranchSelector", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("should render local branches", async () => {
    const { GitBranchSelector } = await import("../GitBranchSelector");
    render(<GitBranchSelector onClose={vi.fn()} />);
    expect(screen.getByText("Local")).toBeDefined();
    expect(screen.getByText("main")).toBeDefined();
    expect(screen.getByText("dev")).toBeDefined();
  });

  it("should render remote branches", async () => {
    const { GitBranchSelector } = await import("../GitBranchSelector");
    render(<GitBranchSelector onClose={vi.fn()} />);
    expect(screen.getByText("Remote")).toBeDefined();
    expect(screen.getByText("feat")).toBeDefined();
  });

  it("should call fetchBranches on mount", async () => {
    const { GitBranchSelector } = await import("../GitBranchSelector");
    render(<GitBranchSelector onClose={vi.fn()} />);
    expect(mockFetchBranches).toHaveBeenCalledWith("/project");
  });

  it("should show check icon for current branch", async () => {
    const { GitBranchSelector } = await import("../GitBranchSelector");
    const { container } = render(<GitBranchSelector onClose={vi.fn()} />);
    const checks = container.querySelectorAll("svg");
    expect(checks.length).toBeGreaterThan(0);
  });

  it("should call checkout and onClose when branch clicked", async () => {
    const onClose = vi.fn();
    const { GitBranchSelector } = await import("../GitBranchSelector");
    render(<GitBranchSelector onClose={onClose} />);
    fireEvent.click(screen.getByText("dev"));
    expect(mockCheckout).toHaveBeenCalledWith("/project", "dev");
    expect(onClose).toHaveBeenCalled();
  });

  it("should not call checkout for current branch", async () => {
    const { GitBranchSelector } = await import("../GitBranchSelector");
    render(<GitBranchSelector onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("main"));
    expect(mockCheckout).not.toHaveBeenCalled();
  });
});
