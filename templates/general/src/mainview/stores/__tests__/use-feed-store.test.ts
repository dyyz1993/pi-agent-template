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

	it("should set author", async () => {
		const { useFeedStore } = await import("../use-feed-store");
		useFeedStore.getState().setAuthor("bob");
		expect(useFeedStore.getState().author).toBe("bob");
	});

	it("should set category", async () => {
		const { useFeedStore } = await import("../use-feed-store");
		useFeedStore.getState().setCategory("news");
		expect(useFeedStore.getState().category).toBe("news");
	});

	it("should set content", async () => {
		const { useFeedStore } = await import("../use-feed-store");
		useFeedStore.getState().setContent("hello world");
		expect(useFeedStore.getState().content).toBe("hello world");
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

	it("should set loading to false on createPost error", async () => {
		const { apiClient } = await import("../../lib/api-client");
		const { useFeedStore } = await import("../use-feed-store");
		(apiClient.call as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("fail"));
		useFeedStore.getState().setContent("content");

		await useFeedStore.getState().createPost();
		expect(useFeedStore.getState().loading).toBe(false);
		expect(useFeedStore.getState().content).toBe("content");
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
		const post = {
			id: "p1",
			content: "hi",
			category: "tech" as const,
			author: "alice",
			timestamp: Date.now(),
		};
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

	it("should set active event type", async () => {
		const { useEventStreamStore } = await import("../use-feed-store");
		useEventStreamStore.getState().setActiveEventType("chat.message");
		expect(useEventStreamStore.getState().activeEventType).toBe("chat.message");
	});

	it("should set active filter", async () => {
		const { useEventStreamStore } = await import("../use-feed-store");
		useEventStreamStore.getState().setActiveFilter('{"key":"val"}');
		expect(useEventStreamStore.getState().activeFilter).toBe('{"key":"val"}');
	});

	it("should subscribe and set state", async () => {
		const { useEventStreamStore } = await import("../use-feed-store");
		await useEventStreamStore.getState().handleSubscribe();
		expect(useEventStreamStore.getState().subscribed).toBe(true);
		expect(useEventStreamStore.getState().subscriptionId).toBe("sub-id");
	});

	it("should unsubscribe and clear state", async () => {
		const { apiClient } = await import("../../lib/api-client");
		const { useEventStreamStore } = await import("../use-feed-store");
		await useEventStreamStore.getState().handleSubscribe();

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
