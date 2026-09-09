interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class RpcCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private defaultTTL: number;
  private pruneTimer: ReturnType<typeof setInterval> | null = null;

  constructor(defaultTTL = 2000) {
    this.defaultTTL = defaultTTL;
  }

  private key(method: string, params: unknown): string {
    return `${method}:${JSON.stringify(params)}`;
  }

  get<T>(method: string, params: unknown, ttl?: number): T | null {
    const k = this.key(method, params);
    const entry = this.cache.get(k);
    if (!entry) return null;

    const effectiveTTL = ttl ?? this.defaultTTL;
    if (Date.now() - entry.timestamp > effectiveTTL) {
      this.cache.delete(k);
      return null;
    }

    return entry.data as T;
  }

  set<T>(method: string, params: unknown, data: T): void {
    const k = this.key(method, params);
    this.cache.set(k, { data, timestamp: Date.now() });
    if (!this.pruneTimer) this.startPruneTimer();
  }

  invalidate(method: string): void {
    const prefix = `${method}:`;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  invalidateAll(methods: string[]): void {
    for (const m of methods) {
      this.invalidate(m);
    }
  }

  clear(): void {
    this.cache.clear();
    if (this.pruneTimer) {
      clearInterval(this.pruneTimer);
      this.pruneTimer = null;
    }
  }

  prune(): void {
    const threshold = this.defaultTTL * 10;
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > threshold) {
        this.cache.delete(key);
      }
    }
    if (this.cache.size === 0 && this.pruneTimer) {
      clearInterval(this.pruneTimer);
      this.pruneTimer = null;
    }
  }

  private startPruneTimer(): void {
    if (this.pruneTimer) return;
    this.pruneTimer = setInterval(() => this.prune(), this.defaultTTL * 5);
  }
}

export const CACHEABLE_METHODS: Record<string, number> = {
  "file.listDir": 2000,
  "file.readFile": 3000,
  "git.status": 2000,
  "git.branches": 5000,
  "git.log": 3000,
  "git.diff": 3000,
  "git.commitFiles": 3000,
  "git.commitFileDiff": 3000,
  "git.worktreeList": 5000,
};

export const rpcCache = new RpcCache(2000);
