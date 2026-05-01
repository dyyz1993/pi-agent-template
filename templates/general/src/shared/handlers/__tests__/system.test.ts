import { describe, test, expect, beforeEach } from "bun:test";
import { register } from "../system";

type Handler = (params: unknown) => Promise<unknown>;

function createMockServer() {
  const handlers = new Map<string, Handler>();
  return {
    register: (method: string, handler: Handler) => {
      handlers.set(method, handler);
    },
    emitEvent: () => {},
    get: (method: string) => handlers.get(method),
    has: (method: string) => handlers.has(method),
  };
}

describe("system handler", () => {
  const server = createMockServer();
  register(server as any, { platform: "desktop" });

  test("registers system.ping", () => {
    expect(server.has("system.ping")).toBe(true);
  });

  test("registers system.hello", () => {
    expect(server.has("system.hello")).toBe(true);
  });

  test("registers system.echo", () => {
    expect(server.has("system.echo")).toBe(true);
  });

  test("system.ping returns pong with timestamp and platform", async () => {
    const before = Date.now();
    const result = await server.get("system.ping")!({}) as any;
    const after = Date.now();

    expect(result.pong).toBe(true);
    expect(result.platform).toBe("desktop");
    expect(result.timestamp).toBeGreaterThanOrEqual(before);
    expect(result.timestamp).toBeLessThanOrEqual(after);
  });

  test("system.ping respects platform option", async () => {
    const webServer = createMockServer();
    register(webServer as any, { platform: "web" });
    const result = await webServer.get("system.ping")!({}) as any;
    expect(result.platform).toBe("web");
  });

  test("system.hello with name returns personalized greeting", async () => {
    const result = await server.get("system.hello")!({ name: "Alice" }) as any;
    expect(result.message).toBe("Hello Alice!");
    expect(result.timestamp).toBeDefined();
  });

  test("system.hello without name defaults to World", async () => {
    const result = await server.get("system.hello")!({}) as any;
    expect(result.message).toBe("Hello World!");
  });

  test("system.hello with undefined name defaults to World", async () => {
    const result = await server.get("system.hello")!({ name: undefined }) as any;
    expect(result.message).toBe("Hello World!");
  });

  test("system.hello with empty string name defaults to World", async () => {
    const result = await server.get("system.hello")!({ name: "" }) as any;
    expect(result.message).toBe("Hello World!");
  });

  test("system.echo returns the input as-is", async () => {
    const data = { foo: "bar", num: 42, nested: { a: [1, 2, 3] } };
    const result = await server.get("system.echo")!(data);
    expect(result).toEqual(data);
  });

  test("system.echo with null returns null", async () => {
    const result = await server.get("system.echo")!(null);
    expect(result).toBeNull();
  });

  test("system.echo with primitive returns primitive", async () => {
    const result = await server.get("system.echo")!(42);
    expect(result).toBe(42);
  });

  test("system.echo with empty object returns empty object", async () => {
    const result = await server.get("system.echo")!({});
    expect(result).toEqual({});
  });
});
