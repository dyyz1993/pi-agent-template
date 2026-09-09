import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { RPCServer } from "@dyyz1993/rpc-core";

describe("Timer Handler", () => {
  let registeredHandlers: Record<string, Function>;
  let mockServer: {
    register: ReturnType<typeof vi.fn>;
    emitEvent: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();
    registeredHandlers = {};
    mockServer = {
      register: vi.fn((method: string, handler: Function) => {
        registeredHandlers[method] = handler;
      }),
      emitEvent: vi.fn(),
    };
    const { register } = await import("../timer");
    register(mockServer as unknown as RPCServer, { platform: "web" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should register timer.start and timer.stop", () => {
    expect(registeredHandlers["timer.start"]).toBeDefined();
    expect(registeredHandlers["timer.stop"]).toBeDefined();
  });

  it("timer.start should return started: true", async () => {
    const result = await registeredHandlers["timer.start"]({});
    expect(result).toEqual({ started: true });
  });

  it("timer.start should return alreadyRunning: true if called twice", async () => {
    await registeredHandlers["timer.start"]({});
    const result = await registeredHandlers["timer.start"]({});
    expect(result).toEqual({ alreadyRunning: true });
  });

  it("timer.start should emit timer.tick events on interval", async () => {
    await registeredHandlers["timer.start"]({});
    vi.advanceTimersByTime(3500);
    expect(mockServer.emitEvent).toHaveBeenCalledTimes(3);
    expect(mockServer.emitEvent).toHaveBeenCalledWith(
      "timer.tick",
      expect.objectContaining({ count: expect.any(Number), timestamp: expect.any(Number) }),
      { channel: "default" },
    );
  });

  it("timer.stop should return stopped: true", async () => {
    await registeredHandlers["timer.start"]({});
    const result = await registeredHandlers["timer.stop"]({});
    expect(result).toEqual({ stopped: true });
  });

  it("timer.stop should stop emitting tick events", async () => {
    await registeredHandlers["timer.start"]({});
    vi.advanceTimersByTime(1500);
    const ticksBefore = mockServer.emitEvent.mock.calls.length;

    await registeredHandlers["timer.stop"]({});
    vi.advanceTimersByTime(3000);

    expect(mockServer.emitEvent.mock.calls.length).toBe(ticksBefore);
  });

  it("timer.stop without start should still return stopped: true", async () => {
    const result = await registeredHandlers["timer.stop"]({});
    expect(result).toEqual({ stopped: true });
  });
});
