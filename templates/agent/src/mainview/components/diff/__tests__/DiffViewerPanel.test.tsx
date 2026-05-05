import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

const mockClearDiff = vi.fn();

vi.mock("../../../stores/use-git-store", () => ({
  useGitStore: (selector: any) =>
    selector({
      currentDiff: {
        filePath: "src/components/App.tsx",
        oldContent: "old code",
        newContent: "new code",
      },
      loadingDiff: false,
      clearDiff: mockClearDiff,
    }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("react-diff-viewer-continued", () => ({
  __esModule: true,
  default: ({ oldValue, newValue }: any) => (
    <div data-testid="diff-viewer">{oldValue} → {newValue}</div>
  ),
  DiffMethod: { LINES: "LINES" },
}));

describe("DiffViewerPanel", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("should render file name in header", async () => {
    const { DiffViewerPanel } = await import("../DiffViewerPanel");
    render(<DiffViewerPanel />);
    expect(screen.getByText("App.tsx")).toBeDefined();
  });

  it("should render full file path", async () => {
    const { DiffViewerPanel } = await import("../DiffViewerPanel");
    render(<DiffViewerPanel />);
    expect(screen.getByText("src/components/App.tsx")).toBeDefined();
  });

  it("should render diff viewer content", async () => {
    const { DiffViewerPanel } = await import("../DiffViewerPanel");
    render(<DiffViewerPanel />);
    expect(screen.getByTestId("diff-viewer")).toBeDefined();
  });

  it("should render view mode toggle buttons", async () => {
    const { DiffViewerPanel } = await import("../DiffViewerPanel");
    render(<DiffViewerPanel />);
    expect(screen.getByTitle("diff.lineByLine")).toBeDefined();
    expect(screen.getByTitle("diff.sideBySide")).toBeDefined();
  });

  it("should return null when no diff and not loading", async () => {
    vi.resetModules();
    vi.doMock("../../../stores/use-git-store", () => ({
      useGitStore: (selector: any) => selector({ currentDiff: null, loadingDiff: false, clearDiff: mockClearDiff }),
    }));
    const mod = await import("../DiffViewerPanel");
    const { container } = render(<mod.DiffViewerPanel />);
    expect(container.innerHTML).toBe("");
    vi.resetModules();
  });
});
