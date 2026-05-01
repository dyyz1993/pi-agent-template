import { describe, test, expect, beforeEach, mock, spyOn } from "bun:test";
import { register } from "../chat";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";

type Handler = (params: unknown) => Promise<unknown>;
type EmittedEvent = { event: string; payload: unknown; filter: unknown };

const STORAGE_PATH = join(homedir(), ".pi-agent", "chat-history.json");

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

async function clearHistory(): Promise<void> {
  try {
    if (existsSync(STORAGE_PATH)) {
      const { unlink } = await import("fs/promises");
      await unlink(STORAGE_PATH);
    }
  } catch {}
}

async function writeHistory(messages: any[]): Promise<void> {
  const dir = dirname(STORAGE_PATH);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(STORAGE_PATH, JSON.stringify(messages, null, 2), "utf-8");
}

describe("chat handler", () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(async () => {
    server = createMockServer();
    register(server as any, { platform: "desktop" });
    await clearHistory();
  });

  test("registers chat.list", () => {
    expect(server.has("chat.list")).toBe(true);
  });

  test("registers chat.send", () => {
    expect(server.has("chat.send")).toBe(true);
  });

  test("chat.list returns empty when no history", async () => {
    const result = await server.get("chat.list")!({}) as any;
    expect(result.messages).toEqual([]);
    expect(result.hasMore).toBe(false);
  });

  test("chat.list with existing history returns messages", async () => {
    const msgs = [
      { id: "1", role: "user", content: "hi", timestamp: 1000 },
      { id: "2", role: "assistant", content: "hello", timestamp: 2000 },
    ];
    await writeHistory(msgs);

    const result = await server.get("chat.list")!({}) as any;
    expect(result.messages.length).toBe(2);
    expect(result.hasMore).toBe(false);
  });

  test("chat.list respects limit param", async () => {
    const msgs = Array.from({ length: 100 }, (_, i) => ({
      id: `msg-${i}`,
      role: i % 2 === 0 ? "user" as const : "assistant" as const,
      content: `message ${i}`,
      timestamp: i * 1000,
    }));
    await writeHistory(msgs);

    const result = await server.get("chat.list")!({ limit: 10 }) as any;
    expect(result.messages.length).toBe(10);
    expect(result.hasMore).toBe(true);
    expect(result.messages[0].id).toBe("msg-90");
  });

  test("chat.list default limit is 50", async () => {
    const msgs = Array.from({ length: 60 }, (_, i) => ({
      id: `msg-${i}`,
      role: "user" as const,
      content: `message ${i}`,
      timestamp: i * 1000,
    }));
    await writeHistory(msgs);

    const result = await server.get("chat.list")!({}) as any;
    expect(result.messages.length).toBe(50);
    expect(result.hasMore).toBe(true);
  });

  test("chat.send returns { ok: true }", async () => {
    const result = await server.get("chat.send")!({ content: "hello" }) as any;
    expect(result.ok).toBe(true);
  });

  test("chat.send emits chat.message events for user and assistant", async () => {
    await server.get("chat.send")!({ content: "hi" });

    const events = server.getEvents().filter((e) => e.event === "chat.message");
    expect(events.length).toBe(2);

    const userEvent = events[0].payload as any;
    expect(userEvent.role).toBe("user");
    expect(userEvent.content).toBe("hi");

    const assistantEvent = events[1].payload as any;
    expect(assistantEvent.role).toBe("assistant");
    expect(assistantEvent.content).toBeTruthy();
  });

  test("chat.send stores messages in history", async () => {
    await server.get("chat.send")!({ content: "hello world" });

    const result = await server.get("chat.list")!({}) as any;
    expect(result.messages.length).toBe(2);
    expect(result.messages[0].role).toBe("user");
    expect(result.messages[0].content).toBe("hello world");
    expect(result.messages[1].role).toBe("assistant");
  });

  test("chat.send message has correct shape", async () => {
    await server.get("chat.send")!({ content: "test" });

    const events = server.getEvents().filter((e) => e.event === "chat.message");
    const userMsg = events[0].payload as any;
    expect(userMsg).toHaveProperty("id");
    expect(userMsg).toHaveProperty("role");
    expect(userMsg).toHaveProperty("content");
    expect(userMsg).toHaveProperty("timestamp");
    expect(typeof userMsg.id).toBe("string");
    expect(typeof userMsg.timestamp).toBe("number");
  });

  test("chat.message events include role filter", async () => {
    await server.get("chat.send")!({ content: "yo" });

    const events = server.getEvents().filter((e) => e.event === "chat.message");
    expect(events[0].filter).toEqual({ role: "user" });
    expect(events[1].filter).toEqual({ role: "assistant" });
  });

  test("chat.send with greeting gets greeting reply", async () => {
    await server.get("chat.send")!({ content: "hello" });

    const events = server.getEvents().filter((e) => e.event === "chat.message");
    const reply = events[1].payload as any;
    expect(reply.content).toBeTruthy();
    expect(reply.role).toBe("assistant");
  });

  test("chat.send with math expression gets calculation reply", async () => {
    await server.get("chat.send")!({ content: "12 * 8" });

    const events = server.getEvents().filter((e) => e.event === "chat.message");
    const reply = events[1].payload as any;
    expect(reply.content).toContain("96");
  });
});
