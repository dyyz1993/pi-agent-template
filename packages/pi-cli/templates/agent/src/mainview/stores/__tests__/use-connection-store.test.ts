import { describe, it, expect, vi, beforeEach } from "vitest";

describe("useConnectionStore", () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  it("should have initial state", async () => {
    const { useConnectionStore } = await import("../use-connection-store");
    const state = useConnectionStore.getState();
    expect(state.mode).toBe("web");
    expect(state.ready).toBe(false);
  });

  it("should set ready state", async () => {
    const { useConnectionStore } = await import("../use-connection-store");
    useConnectionStore.getState().setReady(true);
    expect(useConnectionStore.getState().ready).toBe(true);
  });

  it("should set mode", async () => {
    const { useConnectionStore } = await import("../use-connection-store");
    useConnectionStore.getState().setMode("desktop");
    expect(useConnectionStore.getState().mode).toBe("desktop");
  });
});
