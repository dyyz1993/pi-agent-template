import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";

describe("InlineInput", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("should render input with defaultValue", async () => {
    const { InlineInput } = await import("../InlineInput");
    render(<InlineInput defaultValue="file.ts" depth={0} onSubmit={vi.fn()} onCancel={vi.fn()} />);
    const input = screen.getByDisplayValue("file.ts");
    expect(input).toBeDefined();
  });

  it("should call onSubmit on Enter", async () => {
    const onSubmit = vi.fn();
    const { InlineInput } = await import("../InlineInput");
    render(<InlineInput defaultValue="name" depth={0} onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.keyDown(screen.getByDisplayValue("name"), { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledWith("name");
  });

  it("should call onCancel on Escape", async () => {
    const onCancel = vi.fn();
    const { InlineInput } = await import("../InlineInput");
    render(<InlineInput defaultValue="" depth={0} onSubmit={vi.fn()} onCancel={onCancel} />);
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
    expect(onCancel).toHaveBeenCalled();
  });

  it("should call onCancel on blur", async () => {
    const onCancel = vi.fn();
    const { InlineInput } = await import("../InlineInput");
    render(<InlineInput defaultValue="" depth={0} onSubmit={vi.fn()} onCancel={onCancel} />);
    fireEvent.blur(screen.getByRole("textbox"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("should apply depth-based padding", async () => {
    const { InlineInput } = await import("../InlineInput");
    const { container } = render(<InlineInput depth={2} onSubmit={vi.fn()} onCancel={vi.fn()} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.paddingLeft).toBe("56px");
  });
});
