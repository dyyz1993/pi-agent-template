import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FeedPanel } from "../../components/feed/FeedPanel";
import { useFeedStore, useEventStreamStore } from "../../stores/use-feed-store";
import { act } from "@testing-library/react";

vi.mock("../../lib/api-client", () => ({
  apiClient: {
    call: vi.fn().mockResolvedValue({ posts: [] }),
    subscribe: vi.fn().mockResolvedValue("sub-1"),
    unsubscribe: vi.fn(),
  },
}));

vi.mock("../../stores/use-log-store", () => ({
  useLogStore: Object.assign(
    (s: (state: { addLog: () => void }) => unknown) => s({ addLog: vi.fn() }),
    { getState: () => ({ addLog: vi.fn() }) }
  ),
}));

vi.mock("../../stores/use-connection-store", () => ({
  useConnectionStore: Object.assign(
    (s: (state: { ready: boolean }) => unknown) => s({ ready: true }),
    { getState: () => ({ ready: true }) }
  ),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "feed.title": "Feed",
        "feed.newPost": "New Post",
        "feed.authorPlaceholder": "Author",
        "feed.postPlaceholder": "Write a post...",
        "feed.post": "Post",
        "feed.noPostsYet": "No posts yet",
        "feed.subscribeWithFilter": "Subscribe",
        "feed.filterPlaceholder": "Filter JSON",
        "feed.subscribe": "Subscribe",
        "feed.unsubscribe": "Unsubscribe",
        "feed.noFilter": "No filter",
        "feed.eventStream": "Events",
        "feed.live": "LIVE",
      };
      return map[key] ?? key;
    },
    i18n: { language: "en" },
  }),
}));

describe("FeedPanel", () => {
  beforeEach(() => {
    act(() => {
      useFeedStore.setState({
        posts: [],
        author: "alice",
        category: "tech",
        content: "",
        loading: false,
      });
      useEventStreamStore.setState({
        entries: [],
        activeEventType: "feed.update",
        activeFilter: "",
        subscriptionId: null,
        subscribed: false,
      });
    });
  });

  it("renders feed title", () => {
    render(<FeedPanel />);
    expect(screen.getByText("Feed")).toBeInTheDocument();
  });

  it("shows empty state when no posts", () => {
    render(<FeedPanel />);
    expect(screen.getByText("No posts yet")).toBeInTheDocument();
  });

  it("renders post creation form", () => {
    render(<FeedPanel />);
    expect(screen.getByPlaceholderText("Author")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Write a post...")).toBeInTheDocument();
    expect(screen.getByText("Post")).toBeInTheDocument();
  });

  it("updates author on typing", () => {
    render(<FeedPanel />);
    const input = screen.getByPlaceholderText("Author");
    fireEvent.change(input, { target: { value: "bob" } });
    expect(useFeedStore.getState().author).toBe("bob");
  });

  it("displays posts when present", () => {
    act(() => {
      useFeedStore.setState({
        posts: [
          { id: "1", content: "Hello feed", category: "tech", author: "alice", timestamp: Date.now() },
        ],
      });
    });
    render(<FeedPanel />);
    expect(screen.getByText("Hello feed")).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
  });
});
