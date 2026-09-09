import { describe, it, expect, beforeEach } from "vitest";

describe("useLogStore", () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  it("should start with empty logs", async () => {
    const { useLogStore } = await import("../use-log-store");
    expect(useLogStore.getState().logs).toEqual([]);
  });

  it("should add log entries", async () => {
    const { useLogStore } = await import("../use-log-store");
    useLogStore.getState().addLog("test message");
    const logs = useLogStore.getState().logs;
    expect(logs).toHaveLength(1);
    expect(logs[0]).toContain("test message");
  });

  it("should limit log entries", async () => {
    const { useLogStore } = await import("../use-log-store");
    for (let i = 0; i < 200; i++) {
      useLogStore.getState().addLog(`log ${i}`);
    }
    expect(useLogStore.getState().logs.length).toBeLessThanOrEqual(100);
  });
});
