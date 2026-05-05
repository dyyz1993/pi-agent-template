import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";

const mockCallRPC = vi.fn();
const mockHandleSubscribe = vi.fn();
const mockHandleUnsubscribe = vi.fn();

vi.mock("../../../stores/use-app-store", () => ({
  useAppStore: (selector: any) =>
    selector({
      method: "system.ping",
      result: { pong: true },
      tickEvents: ["tick-1", "tick-2"],
      tickCount: 2,
      subscriptionId: null,
      timerRunning: false,
      setMethod: vi.fn(),
      callRPC: mockCallRPC,
      handleSubscribe: mockHandleSubscribe,
      handleUnsubscribe: mockHandleUnsubscribe,
    }),
}));

vi.mock("../../../stores/use-log-store", () => ({
  useLogStore: (selector: any) =>
    selector({ logs: ["Connected", "Error: timeout"] }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

describe("DebugPanel", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("should render RPC calls section", async () => {
    const { DebugPanel } = await import("../DebugPanel");
    render(<DebugPanel />);
    expect(screen.getByText("debug.rpcCalls")).toBeDefined();
  });

  it("should render subscriptions section", async () => {
    const { DebugPanel } = await import("../DebugPanel");
    render(<DebugPanel />);
    expect(screen.getByText("debug.subscriptions")).toBeDefined();
  });

  it("should render logs section", async () => {
    const { DebugPanel } = await import("../DebugPanel");
    render(<DebugPanel />);
    expect(screen.getByText("debug.logs")).toBeDefined();
  });

  it("should display method select", async () => {
    const { DebugPanel } = await import("../DebugPanel");
    render(<DebugPanel />);
    expect(screen.getByText("system.ping")).toBeDefined();
  });

  it("should render call button", async () => {
    const { DebugPanel } = await import("../DebugPanel");
    render(<DebugPanel />);
    expect(screen.getByText("debug.call")).toBeDefined();
  });

  it("should call callRPC on call button click", async () => {
    const { DebugPanel } = await import("../DebugPanel");
    render(<DebugPanel />);
    fireEvent.click(screen.getByText("debug.call"));
    expect(mockCallRPC).toHaveBeenCalledWith("");
  });

  it("should display result JSON", async () => {
    const { DebugPanel } = await import("../DebugPanel");
    render(<DebugPanel />);
    expect(screen.getByText(/pong/)).toBeDefined();
  });

  it("should display log entries", async () => {
    const { DebugPanel } = await import("../DebugPanel");
    render(<DebugPanel />);
    expect(screen.getByText("Connected")).toBeDefined();
    expect(screen.getByText("Error: timeout")).toBeDefined();
  });

  it("should show subscribe button when not subscribed", async () => {
    const { DebugPanel } = await import("../DebugPanel");
    render(<DebugPanel />);
    expect(screen.getByText("debug.subscribe")).toBeDefined();
  });

  it("should display tick events", async () => {
    const { DebugPanel } = await import("../DebugPanel");
    render(<DebugPanel />);
    expect(screen.getByText("tick-1")).toBeDefined();
    expect(screen.getByText("tick-2")).toBeDefined();
  });
});
