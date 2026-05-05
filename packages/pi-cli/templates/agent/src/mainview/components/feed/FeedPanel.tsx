import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Rss, Send } from "lucide-react";
import { apiClient } from "../../lib/api-client";
import { useLogStore } from "../../stores/use-log-store";
import { useConnectionStore } from "../../stores/use-connection-store";
import { useFeedStore, useEventStreamStore, type SubEventType } from "../../stores/use-feed-store";
import type { FeedCategory } from "../../../shared/modules/feed";

const CATEGORIES: FeedCategory[] = ["tech", "news", "general"];
const EVENT_TYPES: SubEventType[] = ["feed.update", "chat.message", "timer.tick"];
const FILTER_PRESETS: Record<SubEventType, string[]> = {
  "feed.update": ["", '{"category":"tech"}', '{"category":"news"}', '{"author":"alice"}'],
  "chat.message": ["", '{"role":"user"}', '{"role":"assistant"}'],
  "timer.tick": ["", '{"channel":"default"}'],
};

const CATEGORY_COLORS: Record<FeedCategory, string> = {
  tech: "bg-blue-600/30 text-blue-300",
  news: "bg-amber-600/30 text-amber-300",
  general: "bg-green-600/30 text-green-300",
};

export function FeedPanel() {
  const { t } = useTranslation();
  const posts = useFeedStore((s) => s.posts);
  const author = useFeedStore((s) => s.author);
  const category = useFeedStore((s) => s.category);
  const content = useFeedStore((s) => s.content);
  const loading = useFeedStore((s) => s.loading);
  const setAuthor = useFeedStore((s) => s.setAuthor);
  const setCategory = useFeedStore((s) => s.setCategory);
  const setContent = useFeedStore((s) => s.setContent);
  const createPost = useFeedStore((s) => s.createPost);
  const loadPosts = useFeedStore((s) => s.loadPosts);
  const addPost = useFeedStore((s) => s.addPost);
  const addLog = useLogStore((s) => s.addLog);
  const ready = useConnectionStore((s) => s.ready);

  const entries = useEventStreamStore((s) => s.entries);
  const activeEventType = useEventStreamStore((s) => s.activeEventType);
  const activeFilter = useEventStreamStore((s) => s.activeFilter);
  const subscribed = useEventStreamStore((s) => s.subscribed);
  const setActiveEventType = useEventStreamStore((s) => s.setActiveEventType);
  const setActiveFilter = useEventStreamStore((s) => s.setActiveFilter);
  const handleSubscribe = useEventStreamStore((s) => s.handleSubscribe);
  const handleUnsubscribe = useEventStreamStore((s) => s.handleUnsubscribe);

  useEffect(() => {
    if (!ready) return;

    let subId: string | null = null;

    const setup = async () => {
      subId = await apiClient.subscribe("feed.update", (payload) => {
        addPost(payload as typeof posts[number]);
      }, {});
      addLog("Subscribed to feed.update (no filter)");

      await loadPosts();
    };
    setup();

    return () => {
      if (subId) apiClient.unsubscribe(subId);
    };
  }, [ready, addLog, loadPosts, addPost]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
        <h2 className="text-sm font-semibold flex items-center gap-1.5">
          <Rss className="w-4 h-4 text-indigo-400" />
          {t("feed.title")}
          {posts.length > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-indigo-600/30 text-indigo-300 rounded text-[10px]">
              {posts.length}
            </span>
          )}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-gray-800 rounded-lg p-3 space-y-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("feed.newPost")}</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder={t("feed.authorPlaceholder")}
              className="w-24 px-2 py-1.5 text-xs bg-gray-700 rounded text-white border border-gray-600 focus:border-indigo-500 focus:outline-none"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as FeedCategory)}
              className="px-2 py-1.5 text-xs bg-gray-700 rounded text-white border border-gray-600"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && createPost()}
              placeholder={t("feed.postPlaceholder")}
              className="flex-1 px-3 py-1.5 text-xs bg-gray-700 rounded text-white border border-gray-600 focus:border-indigo-500 focus:outline-none"
            />
            <button
              onClick={createPost}
              disabled={loading || !content.trim()}
              className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded transition-colors flex items-center gap-1"
            >
              <Send className="w-3 h-3" />
              {t("feed.post")}
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-3 space-y-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("feed.subscribeWithFilter")}</div>
          <div className="flex gap-2 items-center">
            <select
              value={activeEventType}
              onChange={(e) => {
                setActiveEventType(e.target.value as SubEventType);
                setActiveFilter("");
              }}
              className="px-2 py-1.5 text-xs bg-gray-700 rounded text-white border border-gray-600"
            >
              {EVENT_TYPES.map((et) => (
                <option key={et} value={et}>{et}</option>
              ))}
            </select>
            <input
              type="text"
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              placeholder={t("feed.filterPlaceholder")}
              className="flex-1 px-2 py-1.5 text-xs bg-gray-700 rounded text-white border border-gray-600 focus:border-indigo-500 focus:outline-none font-mono"
            />
            {!subscribed ? (
              <button
                onClick={handleSubscribe}
                className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 rounded transition-colors whitespace-nowrap"
              >
                {t("feed.subscribe")}
              </button>
            ) : (
              <button
                onClick={handleUnsubscribe}
                className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 rounded transition-colors whitespace-nowrap"
              >
                {t("feed.unsubscribe")}
              </button>
            )}
          </div>
          <div className="flex gap-1 flex-wrap">
            {FILTER_PRESETS[activeEventType].map((preset) => (
              <button
                key={preset}
                onClick={() => setActiveFilter(preset)}
                className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                  activeFilter === preset
                    ? "border-indigo-500 bg-indigo-600/30 text-indigo-300"
                    : "border-gray-600 text-gray-400 hover:text-gray-300"
                }`}
              >
                {preset || t("feed.noFilter")}
              </button>
            ))}
          </div>
        </div>

        {entries.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {t("feed.eventStream")}
              </div>
              {subscribed && (
                <span className="px-1.5 py-0.5 bg-green-600/30 text-green-400 rounded text-[10px] animate-pulse">
                  {t("feed.live")}
                </span>
              )}
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {entries.slice(-20).map((entry) => (
                <div key={entry.id} className="bg-gray-700 rounded px-2 py-1.5 text-[11px] font-mono">
                  <div className="flex items-center gap-2 text-gray-400">
                    <span className="text-indigo-300">{entry.eventType}</span>
                    <span className="text-[10px]">
                      {Object.keys(entry.filter).length > 0
                        ? `filter: ${JSON.stringify(entry.filter)}`
                        : t("feed.noFilter")}
                    </span>
                    <span className="text-[10px] ml-auto">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <pre className="text-cyan-300 mt-0.5 whitespace-pre-wrap break-all">
                    {JSON.stringify(entry.payload, null, 0)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {posts.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-gray-500 text-xs">
            {t("feed.noPostsYet")}
          </div>
        ) : (
          <div className="space-y-2">
            {posts.slice().reverse().map((post) => (
              <div key={post.id} className="bg-gray-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-white">{post.author}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${CATEGORY_COLORS[post.category]}`}>
                    {post.category}
                  </span>
                  <span className="text-[10px] text-gray-500 ml-auto">
                    {new Date(post.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-xs text-gray-300">{post.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
