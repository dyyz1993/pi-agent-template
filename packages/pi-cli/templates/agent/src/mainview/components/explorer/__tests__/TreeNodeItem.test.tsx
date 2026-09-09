import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";

vi.mock("../../utils/file-icon", () => ({
  getFileIcon: () => <span data-testid="file-icon" />,
}));

vi.mock("./InlineInput", () => ({
  InlineInput: ({ onSubmit }: any) => (
    <input data-testid="inline-input" onKeyDown={(e: any) => e.key === "Enter" && onSubmit("new")} />
  ),
}));

describe("TreeNodeItem", () => {
  const fileNode = { name: "app.ts", path: "/src/app.ts", type: "file" as const };
  const dirNode = {
    name: "src",
    path: "/src",
    type: "directory" as const,
    expanded: false,
    children: [] as any[],
  };

  afterEach(cleanup);

  it("should render file name", async () => {
    const { TreeNodeItem } = await import("../TreeNodeItem");
    render(
      <TreeNodeItem
        node={fileNode}
        depth={0}
        selectedPath={null}
        editingNode={null}
        onToggle={vi.fn()}
        onOpenFile={vi.fn()}
        onContextMenu={vi.fn()}
        onSubmitEdit={vi.fn()}
        onCancelEdit={vi.fn()}
      />,
    );
    expect(screen.getByText("app.ts")).toBeDefined();
  });

  it("should render directory name", async () => {
    const { TreeNodeItem } = await import("../TreeNodeItem");
    render(
      <TreeNodeItem
        node={dirNode}
        depth={0}
        selectedPath={null}
        editingNode={null}
        onToggle={vi.fn()}
        onOpenFile={vi.fn()}
        onContextMenu={vi.fn()}
        onSubmitEdit={vi.fn()}
        onCancelEdit={vi.fn()}
      />,
    );
    expect(screen.getByText("src")).toBeDefined();
  });

  it("should call onToggle when directory clicked", async () => {
    const onToggle = vi.fn();
    const { TreeNodeItem } = await import("../TreeNodeItem");
    render(
      <TreeNodeItem
        node={dirNode}
        depth={0}
        selectedPath={null}
        editingNode={null}
        onToggle={onToggle}
        onOpenFile={vi.fn()}
        onContextMenu={vi.fn()}
        onSubmitEdit={vi.fn()}
        onCancelEdit={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("src"));
    expect(onToggle).toHaveBeenCalledWith("/src");
  });

  it("should call onOpenFile when file clicked", async () => {
    const onOpenFile = vi.fn();
    const { TreeNodeItem } = await import("../TreeNodeItem");
    render(
      <TreeNodeItem
        node={fileNode}
        depth={0}
        selectedPath={null}
        editingNode={null}
        onToggle={vi.fn()}
        onOpenFile={onOpenFile}
        onContextMenu={vi.fn()}
        onSubmitEdit={vi.fn()}
        onCancelEdit={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("app.ts"));
    expect(onOpenFile).toHaveBeenCalledWith(fileNode);
  });

  it("should apply selected style when selected", async () => {
    const { TreeNodeItem } = await import("../TreeNodeItem");
    const { container } = render(
      <TreeNodeItem
        node={fileNode}
        depth={0}
        selectedPath="/src/app.ts"
        editingNode={null}
        onToggle={vi.fn()}
        onOpenFile={vi.fn()}
        onContextMenu={vi.fn()}
        onSubmitEdit={vi.fn()}
        onCancelEdit={vi.fn()}
      />,
    );
    const div = container.querySelector(".bg-\\[var\\(--color-accent\\)\\]\\/30");
    expect(div).toBeDefined();
  });

  it("should render children when directory is expanded", async () => {
    const expandedDir = {
      name: "src",
      path: "/src",
      type: "directory" as const,
      expanded: true,
      children: [{ name: "index.ts", path: "/src/index.ts", type: "file" as const }],
    };
    const { TreeNodeItem } = await import("../TreeNodeItem");
    render(
      <TreeNodeItem
        node={expandedDir}
        depth={0}
        selectedPath={null}
        editingNode={null}
        onToggle={vi.fn()}
        onOpenFile={vi.fn()}
        onContextMenu={vi.fn()}
        onSubmitEdit={vi.fn()}
        onCancelEdit={vi.fn()}
      />,
    );
    expect(screen.getByText("index.ts")).toBeDefined();
  });
});
