import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/api-client", () => ({
  apiClient: {
    call: vi.fn(),
    subscribe: vi.fn(() => "sub-id"),
    unsubscribe: vi.fn(),
  },
}));

describe("useFeedStore", () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  it("should have correct initial state", async () => {
    const { useFeedStore } = await import("../use-feed-store");
    const state = useFeedStore.getState();
    expect(state.posts).toEqual([]);
    expect(state.author).toBe("alice");
    expect(state.category).toBe("tech");
    expect(state.content).toBe("");
    expect(state.loading).toBe(false);
  });

  it("should set author, category, content", async () => {
    const { useFeedStore } = await import("../use-feed-store");
    const store = useFeedStore.getState();
    store.setAuthor("bob");
    store.setCategory("news");
    store.setContent("hello world");
    const state = useFeedStore.getState();
    expect(state.author).toBe("bob");
    expect(state.category).toBe("news");
    expect(state.content).toBe("hello world");
  });

  it("should create post and clear content", async () => {
    const { apiClient } = await import("../../lib/api-client");
    const { useFeedStore } = await import("../use-feed-store");
    (apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: "post-1" });
    useFeedStore.getState().setContent("  new post  ");

    await useFeedStore.getState().createPost();
    expect(apiClient.call).toHaveBeenCalledWith("feed.post", {
      content: "new post",
      category: "tech",
      author: "alice",
    });
    expect(useFeedStore.getState().content).toBe("");
    expect(useFeedStore.getState().loading).toBe(false);
  });

  it("should not create post with empty content", async () => {
    const { apiClient } = await import("../../lib/api-client");
    const { useFeedStore } = await import("../use-feed-store");

    useFeedStore.setState({ content: "   " });
    (apiClient.call as ReturnType<typeof vi.fn>).mockClear();

    await useFeedStore.getState().createPost();
    expect(apiClient.call).not.toHaveBeenCalled();
  });

  it("should load posts", async () => {
    const { apiClient } = await import("../../lib/api-client");
    const { useFeedStore } = await import("../use-feed-store");
    const posts = [
      { id: "1", content: "hello", category: "tech", author: "alice", timestamp: Date.now() },
    ];
    (apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ posts });

    await useFeedStore.getState().loadPosts();
    expect(useFeedStore.getState().posts).toHaveLength(1);
  });

  it("should add a post locally", async () => {
    const { useFeedStore } = await import("../use-feed-store");
    const post = { id: "p1", content: "hi", category: "tech" as const, author: "alice", timestamp: Date.now() };
    useFeedStore.getState().addPost(post);
    expect(useFeedStore.getState().posts).toHaveLength(1);
    expect(useFeedStore.getState().posts[0].id).toBe("p1");
  });
});

describe("useEventStreamStore", () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  it("should have correct initial state", async () => {
    const { useEventStreamStore } = await import("../use-feed-store");
    const state = useEventStreamStore.getState();
    expect(state.entries).toEqual([]);
    expect(state.activeEventType).toBe("feed.update");
    expect(state.activeFilter).toBe("");
    expect(state.subscriptionId).toBeNull();
    expect(state.subscribed).toBe(false);
  });

  it("should set active event type and filter", async () => {
    const { useEventStreamStore } = await import("../use-feed-store");
    useEventStreamStore.getState().setActiveEventType("chat.message");
    useEventStreamStore.getState().setActiveFilter('{"key":"val"}');
    const state = useEventStreamStore.getState();
    expect(state.activeEventType).toBe("chat.message");
    expect(state.activeFilter).toBe('{"key":"val"}');
  });

  it("should subscribe and unsubscribe", async () => {
    const { apiClient } = await import("../../lib/api-client");
    const { useEventStreamStore } = await import("../use-feed-store");

    await useEventStreamStore.getState().handleSubscribe();
    expect(apiClient.subscribe).toHaveBeenCalled();
    expect(useEventStreamStore.getState().subscribed).toBe(true);
    expect(useEventStreamStore.getState().subscriptionId).toBe("sub-id");

    useEventStreamStore.getState().handleUnsubscribe();
    expect(apiClient.unsubscribe).toHaveBeenCalledWith("sub-id");
    expect(useEventStreamStore.getState().subscribed).toBe(false);
    expect(useEventStreamStore.getState().subscriptionId).toBeNull();
  });

  it("should add entries keeping max 50", async () => {
    const { useEventStreamStore } = await import("../use-feed-store");
    for (let i = 0; i < 55; i++) {
      useEventStreamStore.getState().addEntry("feed.update", { i }, {});
    }
    expect(useEventStreamStore.getState().entries.length).toBeLessThanOrEqual(50);
  });
});
