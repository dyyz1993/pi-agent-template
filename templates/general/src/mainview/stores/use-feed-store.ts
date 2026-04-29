import { create } from "zustand";
import { apiClient } from "../lib/api-client";
import type { FeedCategory, FeedPost } from "../../shared/modules/feed";

interface FeedState {
  posts: FeedPost[];
  author: string;
  category: FeedCategory;
  content: string;
  loading: boolean;

  setAuthor: (author: string) => void;
  setCategory: (category: FeedCategory) => void;
  setContent: (content: string) => void;
  createPost: () => Promise<void>;
  loadPosts: () => Promise<void>;
  addPost: (post: FeedPost) => void;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  posts: [],
  author: "alice",
  category: "tech",
  content: "",
  loading: false,

  setAuthor: (author) => set({ author }),
  setCategory: (category) => set({ category }),
  setContent: (content) => set({ content }),

  createPost: async () => {
    const { content, category, author } = get();
    if (!content.trim()) return;
    set({ loading: true });
    try {
      await apiClient.call("feed.post", { content: content.trim(), category, author });
      set({ content: "", loading: false });
    } catch {
      set({ loading: false });
    }
  },

  loadPosts: async () => {
    try {
      const res = await apiClient.call("feed.list", { limit: 100 });
      set({ posts: res.posts });
    } catch {
      // ignore
    }
  },

  addPost: (post) => set((s) => ({ posts: [...s.posts, post] })),
}));

// --- Event Stream (订阅面板) ---

export type SubEventType = "feed.update" | "chat.message" | "timer.tick";

interface EventEntry {
  id: string;
  eventType: SubEventType;
  payload: unknown;
  filter: Record<string, unknown>;
  timestamp: number;
}

interface EventStreamState {
  entries: EventEntry[];
  activeEventType: SubEventType;
  activeFilter: string; // JSON string for the filter
  subscriptionId: string | null;
  subscribed: boolean;

  setActiveEventType: (t: SubEventType) => void;
  setActiveFilter: (f: string) => void;
  handleSubscribe: () => Promise<void>;
  handleUnsubscribe: () => void;
  addEntry: (eventType: SubEventType, payload: unknown, filter: Record<string, unknown>) => void;
}

export const useEventStreamStore = create<EventStreamState>((set, get) => ({
  entries: [],
  activeEventType: "feed.update",
  activeFilter: "",
  subscriptionId: null,
  subscribed: false,

  setActiveEventType: (t) => set({ activeEventType: t }),
  setActiveFilter: (f) => set({ activeFilter: f }),

  handleSubscribe: async () => {
    const { activeEventType, activeFilter } = get();
    try {
      const filter = activeFilter.trim() ? JSON.parse(activeFilter) : {};
      const subId = await apiClient.subscribe(
        activeEventType,
        (payload: unknown) => {
          get().addEntry(activeEventType, payload, filter);
        },
        filter,
      );
      set({ subscriptionId: subId, subscribed: true });
    } catch (err) {
      console.error("Subscribe error:", err);
    }
  },

  handleUnsubscribe: () => {
    const { subscriptionId } = get();
    if (subscriptionId) {
      apiClient.unsubscribe(subscriptionId);
    }
    set({ subscriptionId: null, subscribed: false });
  },

  addEntry: (eventType, payload, filter) =>
    set((s) => ({
      entries: [
        ...s.entries.slice(-49),
        {
          id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          eventType,
          payload,
          filter,
          timestamp: Date.now(),
        },
      ],
    })),
}));
