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

  it("should prepend timestamp to log entries", async () => {
    const { useLogStore } = await import("../use-log-store");
    useLogStore.getState().addLog("hello");
    const log = useLogStore.getState().logs[0];
    expect(log).toMatch(/^\[\d{2}:\d{2}:\d{2}\] hello$/);
  });

  it("should limit log entries to MAX_LOGS", async () => {
    const { useLogStore } = await import("../use-log-store");
    for (let i = 0; i < 200; i++) {
      useLogStore.getState().addLog(`log ${i}`);
    }
    expect(useLogStore.getState().logs.length).toBeLessThanOrEqual(100);
  });

  it("should keep most recent logs when exceeding limit", async () => {
    const { useLogStore } = await import("../use-log-store");
    for (let i = 0; i < 150; i++) {
      useLogStore.getState().addLog(`log ${i}`);
    }
    const logs = useLogStore.getState().logs;
    expect(logs.length).toBeLessThanOrEqual(100);
    expect(logs[logs.length - 1]).toContain("log 149");
  });
});
