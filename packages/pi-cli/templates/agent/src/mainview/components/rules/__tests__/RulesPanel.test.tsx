import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";

const mockAddRule = vi.fn();
const mockToggleRule = vi.fn();
const mockRemoveRule = vi.fn();
const mockFetchRules = vi.fn();

vi.mock("../../../stores/use-rules-store", () => ({
  useRulesStore: (selector: any) =>
    selector({
      rules: [
        { id: "1", name: "No Console", pattern: "*.ts", enabled: true },
        { id: "2", name: "Test Rule", pattern: "*.test.*", enabled: false },
      ],
      fetchRules: mockFetchRules,
      addRule: mockAddRule,
      toggleRule: mockToggleRule,
      removeRule: mockRemoveRule,
    }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

describe("RulesPanel", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("should render rules title", async () => {
    const { RulesPanel } = await import("../RulesPanel");
    render(<RulesPanel />);
    expect(screen.getByText("rules.title")).toBeDefined();
  });

  it("should render add button", async () => {
    const { RulesPanel } = await import("../RulesPanel");
    render(<RulesPanel />);
    expect(screen.getByText("rules.add")).toBeDefined();
  });

  it("should display rule items", async () => {
    const { RulesPanel } = await import("../RulesPanel");
    render(<RulesPanel />);
    expect(screen.getByText("No Console")).toBeDefined();
    expect(screen.getByText("Test Rule")).toBeDefined();
  });

  it("should call fetchRules on mount", async () => {
    const { RulesPanel } = await import("../RulesPanel");
    render(<RulesPanel />);
    expect(mockFetchRules).toHaveBeenCalled();
  });

  it("should show form when add button is clicked", async () => {
    const { RulesPanel } = await import("../RulesPanel");
    render(<RulesPanel />);
    fireEvent.click(screen.getByText("rules.add"));
    expect(screen.getByPlaceholderText("rules.namePlaceholder")).toBeDefined();
    expect(screen.getByPlaceholderText("rules.patternPlaceholder")).toBeDefined();
  });

  it("should call addRule on form submit", async () => {
    const { RulesPanel } = await import("../RulesPanel");
    render(<RulesPanel />);
    fireEvent.click(screen.getByText("rules.add"));
    fireEvent.change(screen.getByPlaceholderText("rules.namePlaceholder"), { target: { value: "New Rule" } });
    fireEvent.change(screen.getByPlaceholderText("rules.patternPlaceholder"), { target: { value: "*.js" } });
    fireEvent.click(screen.getByText("rules.save"));
    expect(mockAddRule).toHaveBeenCalledWith("New Rule", "*.js");
  });

  it("should call toggleRule on rule click", async () => {
    const { RulesPanel } = await import("../RulesPanel");
    render(<RulesPanel />);
    fireEvent.click(screen.getByText("No Console"));
    expect(mockToggleRule).toHaveBeenCalledWith("1");
  });

  it("should render rule patterns", async () => {
    const { RulesPanel } = await import("../RulesPanel");
    render(<RulesPanel />);
    const patterns = screen.getAllByText("*.ts");
    expect(patterns.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("*.test.*").length).toBeGreaterThanOrEqual(1);
  });
});
