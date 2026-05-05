import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RPCServer } from "@dyyz1993/rpc-core";

vi.mock("../../lib/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe("Feed Handler", () => {
  let registeredHandlers: Record<string, Function>;
  let mockServer: {
    register: ReturnType<typeof vi.fn>;
    emitEvent: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.resetModules();
    registeredHandlers = {};
    mockServer = {
      register: vi.fn((method: string, handler: Function) => {
        registeredHandlers[method] = handler;
      }),
      emitEvent: vi.fn(),
    };
    const { register } = await import("../feed");
    register(mockServer as unknown as RPCServer, { platform: "web" });
  });

  it("should register feed.post and feed.list", () => {
    expect(registeredHandlers["feed.post"]).toBeDefined();
    expect(registeredHandlers["feed.list"]).toBeDefined();
  });

  it("feed.post should create a post and return id", async () => {
    const result = await registeredHandlers["feed.post"]({
      content: "Hello feed",
      category: "tech",
      author: "tester",
    });
    expect(result).toHaveProperty("id");
    expect(result.id).toMatch(/^feed-/);
  });

  it("feed.post should default author to anonymous", async () => {
    await registeredHandlers["feed.post"]({
      content: "test",
      category: "general",
    });
    expect(mockServer.emitEvent).toHaveBeenCalledWith(
      "feed.update",
      expect.objectContaining({ author: "anonymous" }),
      expect.objectContaining({ author: "anonymous" }),
    );
  });

  it("feed.post should emit feed.update event", async () => {
    await registeredHandlers["feed.post"]({
      content: "event test",
      category: "news",
      author: "reporter",
    });
    expect(mockServer.emitEvent).toHaveBeenCalledWith(
      "feed.update",
      expect.objectContaining({
        content: "event test",
        category: "news",
        author: "reporter",
      }),
      { category: "news", author: "reporter" },
    );
  });

  it("feed.list should return all posts by default", async () => {
    await registeredHandlers["feed.post"]({ content: "post 1", category: "tech" });
    await registeredHandlers["feed.post"]({ content: "post 2", category: "general" });

    const result = await registeredHandlers["feed.list"]({});
    expect(result.posts).toHaveLength(2);
  });

  it("feed.list should filter by category", async () => {
    await registeredHandlers["feed.post"]({ content: "tech post", category: "tech" });
    await registeredHandlers["feed.post"]({ content: "news post", category: "news" });
    await registeredHandlers["feed.post"]({ content: "general post", category: "general" });

    const result = await registeredHandlers["feed.list"]({ category: "tech" });
    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].category).toBe("tech");
  });

  it("feed.list should respect limit param", async () => {
    for (let i = 0; i < 5; i++) {
      await registeredHandlers["feed.post"]({ content: `post ${i}`, category: "tech" });
    }

    const result = await registeredHandlers["feed.list"]({ limit: 3 });
    expect(result.posts).toHaveLength(3);
  });

  it("feed.list should default limit to 50", async () => {
    const result = await registeredHandlers["feed.list"]({});
    expect(result.posts.length).toBeLessThanOrEqual(50);
  });
});
