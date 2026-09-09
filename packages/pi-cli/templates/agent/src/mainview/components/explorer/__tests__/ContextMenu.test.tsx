import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";

describe("ContextMenu", () => {
  afterEach(cleanup);

  it("should render menu items", async () => {
    const { ContextMenu } = await import("../ContextMenu");
    const items = [
      { label: "Open", onClick: vi.fn() },
      { label: "Delete", onClick: vi.fn(), danger: true },
    ];
    render(<ContextMenu x={100} y={100} items={items} onClose={vi.fn()} />);
    expect(screen.getByText("Open")).toBeDefined();
    expect(screen.getByText("Delete")).toBeDefined();
  });

  it("should call item onClick and onClose when item clicked", async () => {
    const { ContextMenu } = await import("../ContextMenu");
    const onClick = vi.fn();
    const onClose = vi.fn();
    render(<ContextMenu x={0} y={0} items={[{ label: "Click", onClick }]} onClose={onClose} />);
    fireEvent.click(screen.getByText("Click"));
    expect(onClick).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("should render divider when specified", async () => {
    const { ContextMenu } = await import("../ContextMenu");
    const items = [
      { label: "A", onClick: vi.fn() },
      { label: "", onClick: vi.fn(), divider: true },
      { label: "B", onClick: vi.fn() },
    ];
    const { container } = render(<ContextMenu x={0} y={0} items={items} onClose={vi.fn()} />);
    const dividers = container.querySelectorAll(".border-t");
    expect(dividers.length).toBe(1);
  });

  it("should render icon when provided", async () => {
    const { ContextMenu } = await import("../ContextMenu");
    const items = [
      { label: "Open", onClick: vi.fn(), icon: <span data-testid="icon">🔍</span> },
    ];
    render(<ContextMenu x={0} y={0} items={items} onClose={vi.fn()} />);
    expect(screen.getByTestId("icon")).toBeDefined();
  });
});
