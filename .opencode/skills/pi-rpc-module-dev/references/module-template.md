# 新 RPC 模块模板

将 `<module>` 替换为你的模块名（如 `bookmark`），将 `<Module>` 替换为 PascalCase（如 `Bookmark`）。

---

## 1. 类型定义 — `src/shared/modules/<module>.ts`

```typescript
/**
 * <Module> 模块 — <简短描述>
 */

export type <Module>Status = "active" | "archived";

export interface <Module>Item {
  id: string;
  name: string;
  status: <Module>Status;
  createdAt: number;
}

export interface <Module>Methods {
  "<module>.list": {
    params: {};
    result: { items: <Module>Item[] };
  };
  "<module>.create": {
    params: { name: string };
    result: { item: <Module>Item };
  };
  "<module>.update": {
    params: { id: string; status: <Module>Status };
    result: { item: <Module>Item };
  };
  "<module>.remove": {
    params: { id: string };
    result: { success: boolean };
  };
}

// 可选：事件定义
// export interface <Module>Events {
//   "<module>.changed": { id: string; action: string };
// }
```

---

## 2. Handler 实现 — `src/shared/handlers/<module>.ts`

```typescript
import type { RPCServer } from "@dyyz1993/rpc-core";
import type { MethodParams, MethodResult } from "@dyyz1993/rpc-core";
import type { RPCMethods, HandlerOptions } from "../rpc-schema";
import type { <Module>Item, <Module>Status } from "../modules/<module>";

type RegisterFn = <K extends keyof RPCMethods & string>(
  method: K,
  handler: (params: MethodParams<RPCMethods, K>) => Promise<MethodResult<RPCMethods, K>>,
) => void;

const items: <Module>Item[] = [];
let idCounter = 1;

export function register(server: RPCServer, _options: HandlerOptions): void {
  const r: RegisterFn = (method, handler) => {
    server.register(method, handler as (params: unknown) => Promise<unknown>);
  };

  r("<module>.list", async () => ({ items }));

  r("<module>.create", async (params) => {
    const item: <Module>Item = {
      id: `<module>-${idCounter++}`,
      name: params.name,
      status: "active",
      createdAt: Date.now(),
    };
    items.push(item);
    return { item };
  });

  r("<module>.update", async (params) => {
    const item = items.find((i) => i.id === params.id);
    if (!item) throw new Error(`Item ${params.id} not found`);
    item.status = params.status as <Module>Status;
    return { item };
  });

  r("<module>.remove", async (params) => {
    const idx = items.findIndex((i) => i.id === params.id);
    if (idx === -1) return { success: false };
    items.splice(idx, 1);
    return { success: true };
  });
}
```

---

## 3a. 注册 — `src/shared/handlers/index.ts`（追加一行）

```typescript
export { register as <module> } from "./<module>";
```

## 3b. 类型合并 — `src/shared/rpc-schema.ts`（追加 import + extends）

```typescript
import type { <Module>Methods } from "./modules/<module>";
// 如果有事件：
// import type { <Module>Events } from "./modules/<module>";

export interface RPCMethods extends AnyMethods, /* ...existing... */ <Module>Methods {}

// 如果有事件：
// export interface RPCEvents extends /* ...existing... */ <Module>Events {}
```

---

## 4. 前端 Store — `src/mainview/stores/use-<module>-store.ts`

```typescript
import { create } from "zustand";
import { apiClient } from "../lib/api-client";
import type { <Module>Item } from "../../../shared/modules/<module>";

interface <Module>State {
  items: <Module>Item[];
  loading: boolean;
  fetchItems: () => Promise<void>;
  createItem: (name: string) => Promise<void>;
  updateItem: (id: string, status: string) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
}

export const use<Module>Store = create<<Module>State>((set) => ({
  items: [],
  loading: false,

  fetchItems: async () => {
    set({ loading: true });
    const { items } = await apiClient.call("<module>.list", {});
    set({ items, loading: false });
  },

  createItem: async (name) => {
    const { item } = await apiClient.call("<module>.create", { name });
    set((s) => ({ items: [...s.items, item] }));
  },

  updateItem: async (id, status) => {
    const { item } = await apiClient.call("<module>.update", { id, status });
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? item : i)),
    }));
  },

  removeItem: async (id) => {
    await apiClient.call("<module>.remove", { id });
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
  },
}));
```

---

## 5. 测试 — `src/shared/handlers/__tests__/<module>-handler.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RPCServer } from "@dyyz1993/rpc-core";

describe("<Module> Handler", () => {
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
    const { register } = await import("../<module>");
    register(mockServer as unknown as RPCServer, { platform: "web" });
  });

  it("should register <module> methods", () => {
    expect(registeredHandlers["<module>.list"]).toBeDefined();
    expect(registeredHandlers["<module>.create"]).toBeDefined();
    expect(registeredHandlers["<module>.update"]).toBeDefined();
    expect(registeredHandlers["<module>.remove"]).toBeDefined();
  });

  it("<module>.list should return empty items initially", async () => {
    const result = await registeredHandlers["<module>.list"]({});
    expect(result.items).toEqual([]);
  });

  it("<module>.create should add item", async () => {
    const result = await registeredHandlers["<module>.create"]({ name: "test" });
    expect(result.item.name).toBe("test");
    expect(result.item.id).toBeDefined();

    const list = await registeredHandlers["<module>.list"]({});
    expect(list.items).toHaveLength(1);
  });

  it("<module>.remove should remove item", async () => {
    const { item } = await registeredHandlers["<module>.create"]({ name: "to-remove" });
    const result = await registeredHandlers["<module>.remove"]({ id: item.id });
    expect(result.success).toBe(true);

    const list = await registeredHandlers["<module>.list"]({});
    expect(list.items).toHaveLength(0);
  });

  it("<module>.remove should fail for unknown id", async () => {
    const result = await registeredHandlers["<module>.remove"]({ id: "unknown" });
    expect(result.success).toBe(false);
  });

  it("<module>.update should throw for unknown id", async () => {
    await expect(
      registeredHandlers["<module>.update"]({ id: "unknown", status: "archived" }),
    ).rejects.toThrow();
  });
});
```

---

## 快速检查清单

- [ ] `modules/<module>.ts` — 导出 `<Module>Methods`（和可选 `<Module>Events`）
- [ ] `handlers/<module>.ts` — 导出 `register(server, options)` 函数
- [ ] `handlers/index.ts` — 添加 `export { register as <module> } from "./<module>"`
- [ ] `rpc-schema.ts` — import + extends `<Module>Methods`（和 `<Module>Events`）
- [ ] `handlers/__tests__/<module>-handler.test.ts` — 测试覆盖
- [ ] `npx vitest run` 通过
- [ ] `npx eslint` 通过（RPC 规则检查）
