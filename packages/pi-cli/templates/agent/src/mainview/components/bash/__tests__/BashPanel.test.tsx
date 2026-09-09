import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: (options: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: options.count }).map((_, i) => ({
        index: i,
        key: i,
        start: i * 20,
        size: 20,
      })),
    getTotalSize: () => options.count * 20,
    scrollToIndex: vi.fn(),
  }),
}));

import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";

const mockExecuteCommand = vi.fn();
const mockKillProcess = vi.fn();
const mockSetActive = vi.fn();

vi.mock("../../../stores/use-bash-store", () => ({
  useBashStore: (selector: any) =>
    selector({
      processes: new Map([
        [1234, { running: true, output: "hello\nworld", exitCode: null }],
        [5678, { running: false, output: "done", exitCode: 0 }],
      ]),
      activePid: 1234,
      executeCommand: mockExecuteCommand,
      killProcess: mockKillProcess,
      setActive: mockSetActive,
    }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

describe("BashPanel", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("should render command input", async () => {
    const { BashPanel } = await import("../BashPanel");
    render(<BashPanel />);
    expect(screen.getByPlaceholderText("bash.enterCommand")).toBeDefined();
  });

  it("should render run button", async () => {
    const { BashPanel } = await import("../BashPanel");
    render(<BashPanel />);
    expect(screen.getByText("bash.run")).toBeDefined();
  });

  it("should show process tabs", async () => {
    const { BashPanel } = await import("../BashPanel");
    render(<BashPanel />);
    expect(screen.getByText(/PID 1234/)).toBeDefined();
    expect(screen.getByText(/PID 5678/)).toBeDefined();
  });

  it("should display active process output", async () => {
    const { BashPanel } = await import("../BashPanel");
    render(<BashPanel />);
    expect(screen.getByText("hello")).toBeDefined();
    expect(screen.getByText("world")).toBeDefined();
  });

  it("should render kill button for running process", async () => {
    const { BashPanel } = await import("../BashPanel");
    render(<BashPanel />);
    expect(screen.getByText("bash.kill")).toBeDefined();
  });

  it("should call executeCommand on run", async () => {
    const { BashPanel } = await import("../BashPanel");
    render(<BashPanel />);
    const input = screen.getByPlaceholderText("bash.enterCommand");
    fireEvent.change(input, { target: { value: "ls -la" } });
    fireEvent.click(screen.getByText("bash.run"));
    expect(mockExecuteCommand).toHaveBeenCalledWith("ls -la");
  });

  it("should submit on Enter key", async () => {
    const { BashPanel } = await import("../BashPanel");
    render(<BashPanel />);
    const input = screen.getByPlaceholderText("bash.enterCommand");
    fireEvent.change(input, { target: { value: "pwd" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockExecuteCommand).toHaveBeenCalledWith("pwd");
  });

  it("should show running indicator", async () => {
    const { BashPanel } = await import("../BashPanel");
    render(<BashPanel />);
    expect(screen.getByText(/bash.processRunning/)).toBeDefined();
  });
});
