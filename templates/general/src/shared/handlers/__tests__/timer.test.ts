import { describe, test, expect, beforeEach } from "bun:test";
import { register } from "../timer";

type Handler = (params: unknown) => Promise<unknown>;
type EmittedEvent = { event: string; payload: unknown; filter: unknown };

function createMockServer() {
  const handlers = new Map<string, Handler>();
  const events: EmittedEvent[] = [];
  return {
    register: (method: string, handler: Handler) => {
      handlers.set(method, handler);
    },
    emitEvent: (event: string, payload: unknown, filter?: unknown) => {
      events.push({ event, payload, filter });
    },
    get: (method: string) => handlers.get(method),
    has: (method: string) => handlers.has(method),
    getEvents: () => events,
    clearEvents: () => { events.length = 0; },
  };
}

describe("timer handler", () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    server = createMockServer();
    register(server as Record<string, unknown>, { platform: "desktop" });
  });

  test("registers timer.start", () => {
    expect(server.has("timer.start")).toBe(true);
  });

  test("registers timer.stop", () => {
    expect(server.has("timer.stop")).toBe(true);
  });

  test("timer.start returns { started: true }", async () => {
    const result = await server.get("timer.start")!({}) as Record<string, unknown>;
    expect(result.started).toBe(true);
    expect(result.alreadyRunning).toBeUndefined();
  });

  test("timer.start when already running returns { alreadyRunning: true }", async () => {
    await server.get("timer.start")!({});
    const result = await server.get("timer.start")!({}) as Record<string, unknown>;
    expect(result.alreadyRunning).toBe(true);
    expect(result.started).toBeUndefined();
  });

  test("timer.start emits timer.tick events", async () => {
    await server.get("timer.start")!({});
    await new Promise((r) => setTimeout(r, 1200));

    const tickEvents = server.getEvents().filter((e) => e.event === "timer.tick");
    expect(tickEvents.length).toBeGreaterThanOrEqual(1);

    const payload = tickEvents[0].payload as Record<string, unknown>;
    expect(payload.count).toBeDefined();
    expect(payload.timestamp).toBeDefined();
  });

  test("timer.tick payload has incrementing count", async () => {
    await server.get("timer.start")!({});
    await new Promise((r) => setTimeout(r, 2200));

    const tickEvents = server.getEvents().filter((e) => e.event === "timer.tick");
    const counts = tickEvents.map((e) => (e.payload as Record<string, unknown>).count);
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeGreaterThan(counts[i - 1]);
    }
  });

  test("timer.stop returns { stopped: true }", async () => {
    const result = await server.get("timer.stop")!({}) as Record<string, unknown>;
    expect(result.stopped).toBe(true);
  });

  test("timer.stop then start restarts the timer", async () => {
    const r1 = await server.get("timer.start")!({}) as Record<string, unknown>;
    expect(r1.started).toBe(true);

    await server.get("timer.stop")!({});

    const r2 = await server.get("timer.start")!({}) as Record<string, unknown>;
    expect(r2.started).toBe(true);
  });

  test("timer.stop stops tick events", async () => {
    await server.get("timer.start")!({});
    await new Promise((r) => setTimeout(r, 1100));
    await server.get("timer.stop")!({});

    server.clearEvents();
    await new Promise((r) => setTimeout(r, 1200));

    const tickEvents = server.getEvents().filter((e) => e.event === "timer.tick");
    expect(tickEvents.length).toBe(0);
  });

  test("timer.tick events include filter with channel", async () => {
    await server.get("timer.start")!({});
    await new Promise((r) => setTimeout(r, 1100));

    const tickEvents = server.getEvents().filter((e) => e.event === "timer.tick");
    if (tickEvents.length > 0) {
      expect(tickEvents[0].filter).toEqual({ channel: "default" });
    }
  });
});
