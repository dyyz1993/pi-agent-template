import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

const mockToggle = vi.fn();

vi.mock("../../stores/use-theme-store", () => ({
  useThemeStore: (selector: (s: any) => any) =>
    selector({ theme: "dark", toggleTheme: mockToggle }),
}));

describe("ThemeToggle", () => {
  afterEach(cleanup);

  it("should render a button", async () => {
    const { ThemeToggle } = await import("../ThemeToggle");
    render(<ThemeToggle />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("should show sun icon for dark theme", async () => {
    const { ThemeToggle } = await import("../ThemeToggle");
    const { container } = render(<ThemeToggle />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg!.getAttribute("class")).toContain("text-yellow-400");
  });

  it("should have title Switch to light mode for dark theme", async () => {
    const { ThemeToggle } = await import("../ThemeToggle");
    render(<ThemeToggle />);
    expect(screen.getByRole("button")).toHaveAttribute("title", "Switch to light mode");
  });

  it("should render SVG element inside button", async () => {
    const { ThemeToggle } = await import("../ThemeToggle");
    const { container } = render(<ThemeToggle />);
    const button = container.querySelector("button");
    expect(button!.querySelector("svg")).toBeInTheDocument();
  });
});
