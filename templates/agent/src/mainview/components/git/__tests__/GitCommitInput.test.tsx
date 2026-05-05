import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";

const mockCommit = vi.fn();

vi.mock("../../../stores/use-git-store", () => {
  const state = {
    staged: [{ path: "a.ts", status: "modified" }],
    loadingAction: null as string | null,
    commit: mockCommit,
  };
  return { useGitStore: (selector: any) => selector(state) };
});

vi.mock("../../../stores/use-explorer-store", () => ({
  useExplorerStore: (selector: any) => selector({ currentPath: "/project" }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

describe("GitCommitInput", () => {
  afterEach(() => {
    cleanup();
    mockCommit.mockClear();
  });

  it("should render textarea when staged files exist", async () => {
    const { GitCommitInput } = await import("../GitCommitInput");
    render(<GitCommitInput />);
    expect(screen.getByPlaceholderText("git.commitPlaceholder")).toBeDefined();
  });

  it("should render commit button", async () => {
    const { GitCommitInput } = await import("../GitCommitInput");
    render(<GitCommitInput />);
    expect(screen.getByText("git.commit")).toBeDefined();
  });

  it("should disable commit button when message is empty", async () => {
    const { GitCommitInput } = await import("../GitCommitInput");
    render(<GitCommitInput />);
    const btn = screen.getByText("git.commit");
    expect(btn).toBeDisabled();
  });

  it("should enable commit button when message is entered", async () => {
    const { GitCommitInput } = await import("../GitCommitInput");
    render(<GitCommitInput />);
    const textarea = screen.getByPlaceholderText("git.commitPlaceholder");
    fireEvent.change(textarea, { target: { value: "test commit" } });
    const btn = screen.getByText("git.commit");
    expect(btn).not.toBeDisabled();
  });

  it("should call commit on button click with message", async () => {
    const { GitCommitInput } = await import("../GitCommitInput");
    render(<GitCommitInput />);
    const textarea = screen.getByPlaceholderText("git.commitPlaceholder");
    fireEvent.change(textarea, { target: { value: "test commit" } });
    fireEvent.click(screen.getByText("git.commit"));
    expect(mockCommit).toHaveBeenCalledWith("/project", "test commit");
  });

  it("should submit on Cmd+Enter", async () => {
    const { GitCommitInput } = await import("../GitCommitInput");
    render(<GitCommitInput />);
    const textarea = screen.getByPlaceholderText("git.commitPlaceholder");
    fireEvent.change(textarea, { target: { value: "test" } });
    fireEvent.keyDown(textarea, { key: "Enter", metaKey: true });
    expect(mockCommit).toHaveBeenCalledWith("/project", "test");
  });

  it("should not render when no staged files", async () => {
    vi.resetModules();
    vi.doMock("../../../stores/use-git-store", () => ({
      useGitStore: (selector: any) => selector({ staged: [], loadingAction: null, commit: mockCommit }),
    }));
    vi.doMock("../../../stores/use-explorer-store", () => ({
      useExplorerStore: (selector: any) => selector({ currentPath: "/project" }),
    }));
    vi.doMock("react-i18next", () => ({
      useTranslation: () => ({ t: (k: string) => k }),
    }));
    const mod = await import("../GitCommitInput");
    const { container } = render(<mod.GitCommitInput />);
    expect(container.innerHTML).toBe("");
  });
});
