import { describe, it, expect, beforeEach } from "vitest";

describe("useConnectionStore", () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  it("should have initial state", async () => {
    const { useConnectionStore } = await import("../../stores/use-connection-store");
    const state = useConnectionStore.getState();
    expect(state.mode).toBe("web");
    expect(state.ready).toBe(false);
  });

  it("should set ready state", async () => {
    const { useConnectionStore } = await import("../../stores/use-connection-store");
    useConnectionStore.getState().setReady(true);
    expect(useConnectionStore.getState().ready).toBe(true);
  });

  it("should set mode", async () => {
    const { useConnectionStore } = await import("../../stores/use-connection-store");
    useConnectionStore.getState().setMode("desktop");
    expect(useConnectionStore.getState().mode).toBe("desktop");
  });

  it("should toggle mode between web and desktop", async () => {
    const { useConnectionStore } = await import("../../stores/use-connection-store");
    expect(useConnectionStore.getState().mode).toBe("web");
    useConnectionStore.getState().setMode("desktop");
    expect(useConnectionStore.getState().mode).toBe("desktop");
    useConnectionStore.getState().setMode("web");
    expect(useConnectionStore.getState().mode).toBe("web");
  });
});
