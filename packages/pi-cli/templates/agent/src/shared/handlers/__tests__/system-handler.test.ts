import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RPCServer } from "@dyyz1993/rpc-core";

describe("System Handler", () => {
  let mockServer: { register: ReturnType<typeof vi.fn> };
  let registeredHandlers: Record<string, Function>;

  beforeEach(async () => {
    vi.resetModules();
    registeredHandlers = {};
    mockServer = {
      register: vi.fn((method: string, handler: Function) => {
        registeredHandlers[method] = handler;
      }),
    };
    const { register } = await import("../system");
    register(mockServer as unknown as RPCServer, { platform: "web" });
  });

  it("should register system methods", () => {
    expect(registeredHandlers["system.ping"]).toBeDefined();
    expect(registeredHandlers["system.hello"]).toBeDefined();
    expect(registeredHandlers["system.echo"]).toBeDefined();
  });

  it("system.ping should return pong with timestamp and platform", async () => {
    const result = await registeredHandlers["system.ping"]({});
    expect(result).toHaveProperty("pong", true);
    expect(result).toHaveProperty("timestamp");
    expect(result).toHaveProperty("platform", "web");
    expect(typeof result.timestamp).toBe("number");
  });

  it("system.hello should return greeting with provided name", async () => {
    const result = await registeredHandlers["system.hello"]({ name: "World" });
    expect(result.message).toContain("World");
    expect(result.message).toBe("Hello World!");
    expect(result).toHaveProperty("timestamp");
  });

  it("system.hello should default to 'World'", async () => {
    const result = await registeredHandlers["system.hello"]({});
    expect(result.message).toBe("Hello World!");
  });

  it("system.echo should return input params", async () => {
    const result = await registeredHandlers["system.echo"]({ data: "test", num: 42 });
    expect(result).toEqual({ data: "test", num: 42 });
  });

  it("system.echo should return empty object for empty params", async () => {
    const result = await registeredHandlers["system.echo"]({});
    expect(result).toEqual({});
  });
});
