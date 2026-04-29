/**
 * Feed 模块 — 帖子 & 频道订阅过滤
 */

type FeedCategory = "tech" | "news" | "general";

interface FeedPost {
  id: string;
  content: string;
  category: FeedCategory;
  author: string;
  timestamp: number;
}

export interface FeedMethods {
  "feed.post": {
    params: { content: string; category: FeedCategory; author?: string };
    result: { id: string };
  };
  "feed.list": {
    params: { category?: FeedCategory; limit?: number };
    result: { posts: FeedPost[] };
  };
}

export interface FeedEvents {
  "feed.update": FeedPost;
}

export type { FeedCategory, FeedPost };
