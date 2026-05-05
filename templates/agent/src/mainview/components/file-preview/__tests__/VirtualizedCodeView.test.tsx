import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

vi.mock("../../utils/file-utils", () => ({
  getLanguage: (filename: string) => {
    if (filename.endsWith(".ts")) return "typescript";
    return "";
  },
}));

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: any) => ({
    getTotalSize: () => count * 20,
    getVirtualItems: () =>
      Array.from({ length: Math.min(count, 3) }, (_, i) => ({
        key: i,
        index: i,
        start: i * 20,
        size: 20,
      })),
  }),
}));

vi.mock("prism-react-renderer", () => ({
  Highlight: ({ children, code }: any) =>
    children({
      tokens: code.split("\n").map((line: string) => [{ content: line }]),
      getTokenProps: ({ token }: any) => ({ children: token.content }),
    }),
  themes: { nightOwl: {} },
}));

describe("VirtualizedCodeView", () => {
  afterEach(cleanup);

  it("should render code lines", async () => {
    const { VirtualizedCodeView } = await import("../VirtualizedCodeView");
    const { container } = render(<VirtualizedCodeView code="line1\nline2\nline3" filename="test.ts" />);
    expect(container.textContent).toContain("line1");
    expect(container.textContent).toContain("line2");
    expect(container.textContent).toContain("line3");
  });

  it("should render line numbers", async () => {
    const { VirtualizedCodeView } = await import("../VirtualizedCodeView");
    const { container } = render(<VirtualizedCodeView code="hello\nworld" filename="readme.xyz" />);
    expect(container.textContent).toContain("1");
    expect(container.textContent).toContain("hello");
    expect(container.textContent).toContain("world");
  });

  it("should use plain text for unknown extensions", async () => {
    const { VirtualizedCodeView } = await import("../VirtualizedCodeView");
    render(<VirtualizedCodeView code="data" filename="readme.xyz" />);
    expect(screen.getByText("data")).toBeDefined();
  });
});
