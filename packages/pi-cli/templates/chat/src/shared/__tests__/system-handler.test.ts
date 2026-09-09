import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RPCServer } from "@dyyz1993/rpc-core";

type RegisteredHandler = (params: unknown) => Promise<unknown>;

function createMockServer() {
  const handlers = new Map<string, RegisteredHandler>();
  const server = {
    register: vi.fn((method: string, handler: RegisteredHandler) => {
      handlers.set(method, handler);
    }),
    emitEvent: vi.fn(),
  } as unknown as RPCServer;
  return { server, handlers };
}

describe("system handler", () => {
  let handlers: Map<string, RegisteredHandler>;

  beforeEach(async () => {
    vi.resetModules();
    const { server, handlers: h } = createMockServer();
    handlers = h;
    const { register } = await import("../handlers/system");
    register(server, { platform: "web" });
  });

  it("should register system.ping", () => {
    expect(handlers.has("system.ping")).toBe(true);
  });

  it("should register system.hello", () => {
    expect(handlers.has("system.hello")).toBe(true);
  });

  it("should register system.echo", () => {
    expect(handlers.has("system.echo")).toBe(true);
  });

  it("system.ping returns pong with timestamp and platform", async () => {
    const result = await handlers.get("system.ping")!({});
    expect(result).toEqual(
      expect.objectContaining({
        pong: true,
        platform: "web",
      }),
    );
    expect((result as { timestamp: number }).timestamp).toBeTypeOf("number");
  });

  it("system.hello returns greeting with default name", async () => {
    const result = await handlers.get("system.hello")!({});
    expect(result).toEqual(
      expect.objectContaining({ message: "Hello World!" }),
    );
  });

  it("system.hello returns greeting with custom name", async () => {
    const result = await handlers.get("system.hello")!({ name: "Alice" });
    expect(result).toEqual(
      expect.objectContaining({ message: "Hello Alice!" }),
    );
  });

  it("system.echo returns params as-is", async () => {
    const params = { foo: "bar", num: 42 };
    const result = await handlers.get("system.echo")!(params);
    expect(result).toEqual(params);
  });
});
