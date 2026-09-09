import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

const mockCreatePost = vi.fn();
const mockLoadPosts = vi.fn();
const mockAddPost = vi.fn();
const mockAddLog = vi.fn();

vi.mock("../../../stores/use-feed-store", () => ({
  useFeedStore: (selector: any) =>
    selector({
      posts: [
        { id: "1", author: "alice", category: "tech", content: "Hello world", timestamp: Date.now() },
      ],
      author: "",
      category: "tech",
      content: "",
      loading: false,
      setAuthor: vi.fn(),
      setCategory: vi.fn(),
      setContent: vi.fn(),
      createPost: mockCreatePost,
      loadPosts: mockLoadPosts,
      addPost: mockAddPost,
    }),
  useEventStreamStore: (selector: any) =>
    selector({
      entries: [],
      activeEventType: "feed.update",
      activeFilter: "",
      subscribed: false,
      setActiveEventType: vi.fn(),
      setActiveFilter: vi.fn(),
      handleSubscribe: vi.fn(),
      handleUnsubscribe: vi.fn(),
    }),
}));

vi.mock("../../../stores/use-log-store", () => ({
  useLogStore: (selector: any) => selector({ addLog: mockAddLog }),
}));

vi.mock("../../../stores/use-connection-store", () => ({
  useConnectionStore: (selector: any) => selector({ ready: false }),
}));

vi.mock("../../../lib/api-client", () => ({
  apiClient: { subscribe: vi.fn(async () => "sub-1"), unsubscribe: vi.fn() },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

describe("FeedPanel", () => {
  afterEach(cleanup);

  it("should render feed title", async () => {
    const { FeedPanel } = await import("../FeedPanel");
    render(<FeedPanel />);
    expect(screen.getByText("feed.title")).toBeDefined();
  });

  it("should render new post section", async () => {
    const { FeedPanel } = await import("../FeedPanel");
    render(<FeedPanel />);
    expect(screen.getByText("feed.newPost")).toBeDefined();
  });

  it("should render subscribe section", async () => {
    const { FeedPanel } = await import("../FeedPanel");
    render(<FeedPanel />);
    expect(screen.getByText("feed.subscribeWithFilter")).toBeDefined();
  });

  it("should display existing posts", async () => {
    const { FeedPanel } = await import("../FeedPanel");
    render(<FeedPanel />);
    expect(screen.getByText("Hello world")).toBeDefined();
    expect(screen.getByText("alice")).toBeDefined();
  });

  it("should show post count badge", async () => {
    const { FeedPanel } = await import("../FeedPanel");
    render(<FeedPanel />);
    expect(screen.getByText("1")).toBeDefined();
  });

  it("should render author input", async () => {
    const { FeedPanel } = await import("../FeedPanel");
    render(<FeedPanel />);
    expect(screen.getByPlaceholderText("feed.authorPlaceholder")).toBeDefined();
  });

  it("should render post input", async () => {
    const { FeedPanel } = await import("../FeedPanel");
    render(<FeedPanel />);
    expect(screen.getByPlaceholderText("feed.postPlaceholder")).toBeDefined();
  });

  it("should render category select with options", async () => {
    const { FeedPanel } = await import("../FeedPanel");
    render(<FeedPanel />);
    const techOptions = screen.getAllByText("tech");
    expect(techOptions.length).toBeGreaterThanOrEqual(1);
  });
});
