import type { RPCServer } from "@dyyz1993/rpc-core";
import type { MethodParams, MethodResult } from "@dyyz1993/rpc-core";
import type { RPCMethods, HandlerOptions } from "../rpc-schema";
import type { FeedPost, FeedCategory } from "../modules/feed";
import { createLogger } from "../lib/logger";

const log = createLogger("feed");

// 内存存储
const posts: FeedPost[] = [];

type RegisterFn = <K extends keyof RPCMethods & string>(
  method: K,
  handler: (params: MethodParams<RPCMethods, K>) => Promise<MethodResult<RPCMethods, K>>,
) => void;

export function register(server: RPCServer, _options: HandlerOptions): void {
  const r: RegisterFn = (method, handler) => {
    server.register(method, handler as (params: unknown) => Promise<unknown>);
  };

  r("feed.post", async (params) => {
    const category = params.category as FeedCategory;
    const author = (params.author as string) || "anonymous";

    const post: FeedPost = {
      id: `feed-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      content: params.content,
      category,
      author,
      timestamp: Date.now(),
    };

    posts.push(post);
    log.info(`New post: ${post.id} [${category}] by ${author}`);

    // 发送事件 — metadata 用于过滤
    server.emitEvent("feed.update", post, { category, author });

    return { id: post.id };
  });

  r("feed.list", async (params) => {
    const limit = params.limit ?? 50;
    let filtered = posts;

    if (params.category) {
      filtered = posts.filter((p) => p.category === params.category);
    }

    return { posts: filtered.slice(-limit) };
  });
}
