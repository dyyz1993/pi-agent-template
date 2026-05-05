import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

describe("ConfirmDialog", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("should render title and message", async () => {
    const { ConfirmDialog } = await import("../ConfirmDialog");
    render(<ConfirmDialog title="Delete?" message="Are you sure?" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("Delete?")).toBeDefined();
    expect(screen.getByText("Are you sure?")).toBeDefined();
  });

  it("should call onConfirm when confirm button clicked", async () => {
    const onConfirm = vi.fn();
    const { ConfirmDialog } = await import("../ConfirmDialog");
    render(<ConfirmDialog title="T" message="M" onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByText("common.delete"));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("should call onCancel when cancel button clicked", async () => {
    const onCancel = vi.fn();
    const { ConfirmDialog } = await import("../ConfirmDialog");
    render(<ConfirmDialog title="T" message="M" onConfirm={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByText("common.cancel"));
    expect(onCancel).toHaveBeenCalled();
  });
});
