import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/api-client", () => ({
  apiClient: {
    call: vi.fn().mockResolvedValue({ pong: true, timestamp: Date.now(), platform: "web" }),
    subscribe: vi.fn().mockResolvedValue("sub-id"),
    unsubscribe: vi.fn(),
  },
}));

vi.mock("./use-log-store", () => ({
  useLogStore: {
    getState: () => ({ addLog: vi.fn() }),
  },
}));

describe("useAppStore", () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  it("should have initial state", async () => {
    const { useAppStore } = await import("../use-app-store");
    const state = useAppStore.getState();
    expect(state.method).toBe("system.ping");
    expect(state.result).toBeNull();
    expect(state.tickEvents).toEqual([]);
    expect(state.tickCount).toBe(0);
    expect(state.subscriptionId).toBeNull();
    expect(state.timerRunning).toBe(false);
  });

  it("should set method", async () => {
    const { useAppStore } = await import("../use-app-store");
    useAppStore.getState().setMethod("system.hello");
    expect(useAppStore.getState().method).toBe("system.hello");
  });

  it("should callRPC and store result for system.ping", async () => {
    const { useAppStore } = await import("../use-app-store");
    await useAppStore.getState().callRPC("test");
    expect(useAppStore.getState().result).toEqual(
      expect.objectContaining({ pong: true }),
    );
  });

  it("should handleSubscribe and start timer", async () => {
    const { apiClient } = await import("../../lib/api-client");
    const { useAppStore } = await import("../use-app-store");

    await useAppStore.getState().handleSubscribe();
    expect(apiClient.call).toHaveBeenCalledWith("timer.start", {});
    expect(useAppStore.getState().timerRunning).toBe(true);
    expect(apiClient.subscribe).toHaveBeenCalledWith(
      "timer.tick",
      expect.any(Function),
      {},
    );
    expect(useAppStore.getState().subscriptionId).toBe("sub-id");
  });

  it("should handleUnsubscribe and stop timer", async () => {
    const { apiClient } = await import("../../lib/api-client");
    const { useAppStore } = await import("../use-app-store");

    await useAppStore.getState().handleSubscribe();
    await useAppStore.getState().handleUnsubscribe();

    expect(apiClient.unsubscribe).toHaveBeenCalledWith("sub-id");
    expect(useAppStore.getState().timerRunning).toBe(false);
    expect(useAppStore.getState().subscriptionId).toBeNull();
  });

  it("should stop timer even without subscription", async () => {
    const { apiClient } = await import("../../lib/api-client");
    const { useAppStore } = await import("../use-app-store");

    (apiClient.unsubscribe as ReturnType<typeof vi.fn>).mockClear();
    (apiClient.call as ReturnType<typeof vi.fn>).mockClear();

    await useAppStore.getState().handleUnsubscribe();
    expect(apiClient.unsubscribe).not.toHaveBeenCalled();
    expect(apiClient.call).toHaveBeenCalledWith("timer.stop", {});
    expect(useAppStore.getState().timerRunning).toBe(false);
  });
});
