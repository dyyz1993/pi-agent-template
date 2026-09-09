import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

vi.mock("../../stores/use-explorer-store", () => {
  const toggleNode = vi.fn();
  const openFile = vi.fn();
  const setCurrentPath = vi.fn();
  const listRootDir = vi.fn();
  const startEditing = vi.fn();
  const cancelEditing = vi.fn();
  const createFile = vi.fn();
  const createDir = vi.fn();
  const renameNode = vi.fn();
  const deleteNode = vi.fn();
  const importFiles = vi.fn();

  const state = {
    treeNodes: [
      {
        name: "src",
        path: "/project/src",
        type: "directory" as const,
        children: [],
        expanded: false,
        loaded: false,
      },
      {
        name: "package.json",
        path: "/project/package.json",
        type: "file" as const,
      },
    ],
    currentPath: "/project",
    selectedPath: null,
    editingNode: null,
    toggleNode,
    loadDirectory: vi.fn(),
    openFile,
    setCurrentPath,
    listRootDir,
    startEditing,
    cancelEditing,
    createFile,
    createDir,
    renameNode,
    deleteNode,
    importFiles,
  };

  return {
    useExplorerStore: (selector: (s: typeof state) => unknown) => selector(state),
  };
});

vi.mock("../../stores/use-sidebar-store", () => ({
  useSidebarStore: () => ({ isPinned: true, setPinned: vi.fn(), breakpoint: "desktop" }),
}));

vi.mock("../../utils/drop-handler", () => ({
  readDropItems: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../utils/file-icon", () => ({
  getFileIcon: () => <span data-testid="file-icon" />,
}));

describe("ExplorerSidebar (no props drilling)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with zero data/action props — only store", async () => {
    const { ExplorerSidebar } = await import(
      "../../components/explorer/ExplorerSidebar"
    );
    render(<ExplorerSidebar />);

    expect(screen.getByText("src")).toBeInTheDocument();
    expect(screen.getByText("package.json")).toBeInTheDocument();
  });

  it("calls toggleNode from store on directory click", async () => {
    const { useExplorerStore } = await import(
      "../../stores/use-explorer-store"
    );
    const { ExplorerSidebar } = await import(
      "../../components/explorer/ExplorerSidebar"
    );
    render(<ExplorerSidebar />);

    const srcNode = screen.getByText("src");
    fireEvent.click(srcNode);

    const store = useExplorerStore((s: any) => s);
    expect(store.toggleNode).toHaveBeenCalledWith("/project/src");
  });

  it("renders with hideOuterShell to remove outer wrapper", async () => {
    const { ExplorerSidebar } = await import(
      "../../components/explorer/ExplorerSidebar"
    );
    const { container } = render(<ExplorerSidebar hideOuterShell />);

    const outer = container.querySelector(".sidebar-outer");
    expect(outer).toBeNull();
  });

  it("renders path input with currentPath from store", async () => {
    const { ExplorerSidebar } = await import(
      "../../components/explorer/ExplorerSidebar"
    );
    render(<ExplorerSidebar />);

    const input = screen.getByPlaceholderText("explorer.pathPlaceholder") as HTMLInputElement;
    expect(input.value).toBe("/project");
  });

  it("calls listRootDir from store on refresh button click", async () => {
    const { useExplorerStore } = await import(
      "../../stores/use-explorer-store"
    );
    const { ExplorerSidebar } = await import(
      "../../components/explorer/ExplorerSidebar"
    );
    render(<ExplorerSidebar />);

    const refreshBtn = screen.getByTitle("explorer.listDirectory");
    fireEvent.click(refreshBtn);

    const store = useExplorerStore((s: any) => s);
    expect(store.listRootDir).toHaveBeenCalled();
  });
});
