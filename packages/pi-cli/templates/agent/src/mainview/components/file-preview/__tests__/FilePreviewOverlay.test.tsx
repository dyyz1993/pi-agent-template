import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";

const mockOnClose = vi.fn();

vi.mock("../../../utils/file-utils", () => ({
  formatSize: (bytes: number) => `${bytes} B`,
}));

vi.mock("../VirtualizedCodeView", () => ({
  VirtualizedCodeView: ({ code }: any) => <div data-testid="code-view">{code}</div>,
}));

describe("FilePreviewOverlay", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("should render file name", async () => {
    const { FilePreviewOverlay } = await import("../FilePreviewOverlay");
    render(
      <FilePreviewOverlay
        preview={{ name: "test.ts", path: "/test.ts", size: 100, content: "const x = 1;", isImage: false }}
        loading={false}
        onClose={mockOnClose}
      />,
    );
    expect(screen.getByText("test.ts")).toBeDefined();
  });

  it("should render file size", async () => {
    const { FilePreviewOverlay } = await import("../FilePreviewOverlay");
    const { container } = render(
      <FilePreviewOverlay
        preview={{ name: "test.ts", path: "/test.ts", size: 1024, content: "code", isImage: false }}
        loading={false}
        onClose={mockOnClose}
      />,
    );
    expect(container.textContent).toContain("1024 B");
  });

  it("should render code view when not loading", async () => {
    const { FilePreviewOverlay } = await import("../FilePreviewOverlay");
    render(
      <FilePreviewOverlay
        preview={{ name: "test.ts", path: "/test.ts", size: 0, content: "const x = 1;", isImage: false }}
        loading={false}
        onClose={mockOnClose}
      />,
    );
    expect(screen.getByTestId("code-view")).toBeDefined();
  });

  it("should show loading spinner when loading", async () => {
    const { FilePreviewOverlay } = await import("../FilePreviewOverlay");
    render(
      <FilePreviewOverlay
        preview={{ name: "test.ts", path: "/test.ts", size: 0, content: "", isImage: false }}
        loading={true}
        onClose={mockOnClose}
      />,
    );
    expect(screen.getByText("Loading...")).toBeDefined();
  });

  it("should call onClose when close button clicked", async () => {
    const { FilePreviewOverlay } = await import("../FilePreviewOverlay");
    const { container } = render(
      <FilePreviewOverlay
        preview={{ name: "test.ts", path: "/test.ts", size: 0, content: "code", isImage: false }}
        loading={false}
        onClose={mockOnClose}
      />,
    );
    const btn = container.querySelector("button");
    fireEvent.click(btn!);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("should render image when isImage is true", async () => {
    const { FilePreviewOverlay } = await import("../FilePreviewOverlay");
    render(
      <FilePreviewOverlay
        preview={{ name: "photo.png", path: "/photo.png", size: 5000, content: "", isImage: true, imageUrl: "http://img.png" }}
        loading={false}
        onClose={mockOnClose}
      />,
    );
    const img = screen.getByRole("img");
    expect(img).toBeDefined();
    expect(img.getAttribute("alt")).toBe("photo.png");
  });
});
