---
name: pi-rpc-module-dev
version: "1.0.0"
description: >
  新增 RPC 模块的完整开发流程。当用户需要给 AI Agent 模板添加新功能（如新的工具、服务、面板）时，
  使用此 Skill 引导完成类型定义 → Handler 实现 → 注册编排 → 前端调用 → 测试的完整流程。
  当用户提到"新增功能"、"添加模块"、"新 RPC 方法"、"新增 handler"、"添加 XXX 功能"时，
  都应该使用此 Skill，即使用户没有明确提到 "RPC" 或 "模块"。
---

# Pi RPC 模块开发指南

## 概述

本项目的核心架构是 **RPC 模块化**。每个新功能 = 一个新 RPC 模块，遵循统一的三层架构：

```
类型层:   modules/xxx.ts        → 定义方法签名（params/result）
实现层:   handlers/xxx.ts       → 实现 handler 逻辑
注册层:   handlers/index.ts     → barrel export（自动发现）
         rpc-schema.ts         → 类型合并入口
```

**Handler 只注册一遍，桌面端（IPC）和 Web 端（WebSocket）自动共享。** 入口文件（`bun/index.ts`、`server.ts`）永远不需要修改。

---

## 开发流程（5 步）

### Step 1: 定义 Types — `src/shared/modules/<module>.ts`

创建模块类型文件，导出 `<Module>Methods` 接口（必须），可选导出 `<Module>Events` 接口。

```typescript
/**
 * <Module> 模块 — <简短描述>
 */

// 可选：导出共享类型供前后端复用
export type XxxStatus = "active" | "inactive";

export interface XxxItem {
	id: string;
	name: string;
	status: XxxStatus;
}

// 必须：方法类型定义
export interface XxxMethods {
	"xxx.list": {
		params: {};
		result: { items: XxxItem[] };
	};
	"xxx.create": {
		params: { name: string };
		result: { item: XxxItem };
	};
	"xxx.update": {
		params: { id: string; status: XxxStatus };
		result: { item: XxxItem };
	};
	"xxx.remove": {
		params: { id: string };
		result: { success: boolean };
	};
}

// 可选：事件类型定义
export interface XxxEvents {
	"xxx.changed": { id: string; action: string };
}
```

**关键规则：**

- 方法名必须以 `xxx.` 前缀开头（文件名即模块名）
- 必须导出 `<PascalCase>Methods` 接口（ESLint 强制）
- `params` 至少为 `{}`，不可省略

### Step 2: 实现 Handler — `src/shared/handlers/<module>.ts`

```typescript
import type { RPCServer } from "@dyyz1993/rpc-core";
import type { MethodParams, MethodResult } from "@dyyz1993/rpc-core";
import type { RPCMethods, HandlerOptions } from "../rpc-schema";
import type { XxxItem, XxxStatus } from "../modules/xxx";

type RegisterFn = <K extends keyof RPCMethods & string>(
	method: K,
	handler: (params: MethodParams<RPCMethods, K>) => Promise<MethodResult<RPCMethods, K>>
) => void;

const items: XxxItem[] = [];
let idCounter = 1;

export function register(server: RPCServer, _options: HandlerOptions): void {
	const r: RegisterFn = (method, handler) => {
		server.register(method, handler as (params: unknown) => Promise<unknown>);
	};

	r("xxx.list", async () => ({ items }));

	r("xxx.create", async (params) => {
		const item: XxxItem = {
			id: `xxx-${idCounter++}`,
			name: params.name,
			status: "active",
		};
		items.push(item);
		return { item };
	});

	r("xxx.update", async (params) => {
		const item = items.find((i) => i.id === params.id);
		if (!item) throw new Error(`Item ${params.id} not found`);
		item.status = params.status as XxxStatus;
		return { item };
	});

	r("xxx.remove", async (params) => {
		const idx = items.findIndex((i) => i.id === params.id);
		if (idx === -1) return { success: false };
		items.splice(idx, 1);
		return { success: true };
	});
}
```

**Handler 签名约定：**

- 导出函数名必须是 `register`
- 签名：`(server: RPCServer, options: HandlerOptions) => void`
- 使用类型安全的 `RegisterFn` 包装器注册方法
- 通过 `r("module.action", handler)` 注册，自动获得 params/result 类型推导

**如果模块需要事件推送：**

```typescript
r("xxx.create", async (params) => {
	// ...创建逻辑
	server.emitEvent("xxx.changed", { id: item.id, action: "created" }, {});
	return { item };
});
```

### Step 3: 注册编排（2 处修改）

**3a. `src/shared/handlers/index.ts`** — 加一行 barrel export：

```typescript
export { register as system } from "./system";
export { register as file } from "./file";
// ... 其他模块
export { register as xxx } from "./xxx"; // ← 新增这一行
```

**3b. `src/shared/rpc-schema.ts`** — 加 import 和 extends：

```typescript
import type { XxxMethods } from "./modules/xxx";
// 如果有事件：
import type { XxxEvents } from "./modules/xxx";

export interface RPCMethods extends AnyMethods, SystemMethods, /* ... */ XxxMethods {}

// 如果有事件：
export interface RPCEvents extends TimerEvents, /* ... */ XxxEvents {}
```

**完成。** `register-all-handlers.ts` 会自动通过 `Object.values(handlers)` 发现新模块，无需修改。

### Step 4: 前端调用

**4a. 通过 apiClient 调用（组件中）：**

```typescript
import { apiClient } from "../../lib/api-client";

// 调用 RPC 方法（自动类型推导）
const result = await apiClient.call("xxx.list", {});
const created = await apiClient.call("xxx.create", { name: "hello" });

// 订阅事件（如果模块有事件）
const subId = await apiClient.subscribe(
	"xxx.changed",
	(payload) => {
		console.log(payload.id, payload.action);
	},
	{}
);
apiClient.unsubscribe(subId);
```

**4b. 创建 Zustand Store（可选，推荐用于状态管理）：**

```typescript
// stores/use-xxx-store.ts
import { create } from "zustand";
import { apiClient } from "../lib/api-client";
import type { XxxItem } from "../../../shared/modules/xxx";

interface XxxState {
	items: XxxItem[];
	loading: boolean;
	fetchItems: () => Promise<void>;
	createItem: (name: string) => Promise<void>;
	removeItem: (id: string) => Promise<void>;
}

export const useXxxStore = create<XxxState>((set) => ({
	items: [],
	loading: false,

	fetchItems: async () => {
		set({ loading: true });
		const { items } = await apiClient.call("xxx.list", {});
		set({ items, loading: false });
	},

	createItem: async (name) => {
		const { item } = await apiClient.call("xxx.create", { name });
		set((s) => ({ items: [...s.items, item] }));
	},

	removeItem: async (id) => {
		await apiClient.call("xxx.remove", { id });
		set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
	},
}));
```

### Step 5: 编写测试

**测试文件位置：** `src/shared/handlers/__tests__/<module>-handler.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RPCServer } from "@dyyz1993/rpc-core";

describe("Xxx Handler", () => {
	let registeredHandlers: Record<string, Function>;
	let mockServer: { register: ReturnType<typeof vi.fn>; emitEvent: ReturnType<typeof vi.fn> };

	beforeEach(async () => {
		vi.resetModules();
		registeredHandlers = {};
		mockServer = {
			register: vi.fn((method: string, handler: Function) => {
				registeredHandlers[method] = handler;
			}),
			emitEvent: vi.fn(),
		};
		const { register } = await import("../xxx");
		register(mockServer as unknown as RPCServer, { platform: "web" });
	});

	it("should register xxx methods", () => {
		expect(registeredHandlers["xxx.list"]).toBeDefined();
		expect(registeredHandlers["xxx.create"]).toBeDefined();
		expect(registeredHandlers["xxx.update"]).toBeDefined();
		expect(registeredHandlers["xxx.remove"]).toBeDefined();
	});

	it("xxx.list should return empty items initially", async () => {
		const result = await registeredHandlers["xxx.list"]({});
		expect(result.items).toEqual([]);
	});

	it("xxx.create should add item and return it", async () => {
		const result = await registeredHandlers["xxx.create"]({ name: "test" });
		expect(result.item.name).toBe("test");
		expect(result.item.id).toBeDefined();

		const list = await registeredHandlers["xxx.list"]({});
		expect(list.items).toHaveLength(1);
	});

	it("xxx.remove should remove item", async () => {
		const { item } = await registeredHandlers["xxx.create"]({ name: "to-remove" });
		const result = await registeredHandlers["xxx.remove"]({ id: item.id });
		expect(result.success).toBe(true);

		const list = await registeredHandlers["xxx.list"]({});
		expect(list.items).toHaveLength(0);
	});

	it("xxx.remove should fail for unknown id", async () => {
		const result = await registeredHandlers["xxx.remove"]({ id: "unknown" });
		expect(result.success).toBe(false);
	});

	it("xxx.update should throw for unknown id", async () => {
		await expect(
			registeredHandlers["xxx.update"]({ id: "unknown", status: "inactive" })
		).rejects.toThrow();
	});
});
```

**运行测试：**

```bash
npx vitest run src/shared/handlers/__tests__/xxx-handler.test.ts
```

---

## 命名规范

### 方法命名

格式：`<模块名>.<动作名>`（点分隔，全 camelCase）

| 模块   | 方法示例                        | 说明       |
| ------ | ------------------------------- | ---------- |
| system | `system.ping`, `system.hello`   | 基础连通性 |
| file   | `file.listDir`, `file.readFile` | 文件系统   |
| timer  | `timer.start`, `timer.stop`     | 定时器     |
| chat   | `chat.send`, `chat.list`        | 聊天       |
| git    | `git.status`, `git.commit`      | 版本控制   |
| bash   | `bash.execute`, `bash.kill`     | Shell 执行 |
| feed   | `feed.post`, `feed.list`        | 动态       |
| todo   | `todo.add`, `todo.remove`       | 任务管理   |
| rules  | `rules.add`, `rules.toggle`     | 规则管理   |

**禁止：** `ping`（无前缀）、`filelistDir`（无点分隔）、`file-listDir`（用连字符）

### 文件命名

| 文件                       | 位置                         | 说明         |
| -------------------------- | ---------------------------- | ------------ |
| `<module>.ts`              | `shared/modules/`            | 类型定义     |
| `<module>.ts`              | `shared/handlers/`           | Handler 实现 |
| `<module>-handler.test.ts` | `shared/handlers/__tests__/` | 测试         |

### 类型命名

| 类型     | 格式                            | 示例                         |
| -------- | ------------------------------- | ---------------------------- |
| 方法接口 | `<PascalCase>Methods`           | `TodoMethods`, `BashMethods` |
| 事件接口 | `<PascalCase>Events`            | `BashEvents`, `TimerEvents`  |
| 共享类型 | `<PascalCase><Item/Status/...>` | `TodoItem`, `FeedCategory`   |

---

## ESLint 规则（强制）

违反以下规则的代码将被 pre-commit 检查拒绝：

| 编号 | 规则                           | 说明                                                          |
| ---- | ------------------------------ | ------------------------------------------------------------- |
| R1   | `rpc/no-bare-method`           | 方法名必须使用 `module.action` 格式，禁止裸方法名             |
| R2   | `rpc/no-direct-register`       | 入口文件禁止直接调用 `server.register()`                      |
| R3   | `rpc/schema-merge-only`        | `rpc-schema.ts` 只能做类型合并，禁止直接定义方法              |
| R4   | `rpc/module-file-naming`       | 模块文件必须导出 `<Name>Methods` 接口，方法前缀必须匹配文件名 |
| R5   | `rpc/require-typed-register`   | 入口文件必须导入 `registerAllHandlers`                        |
| R6   | `rpc/require-api-client`       | 前端禁止绕过 `apiClient` 直接操作 WebSocket                   |
| R7   | `rpc/no-deep-relative-imports` | 禁止超过两层 `../` 的相对路径导入                             |
| R8   | `rpc/no-hardcoded-strings`     | 禁止在组件中硬编码 UI 文本，必须通过 `t()` 获取 i18n 翻译     |

---

## 安全注意事项

### Bash 模块

所有 shell 命令必须通过 `bash-security.ts` 验证：

```typescript
import { validateCommand } from "../lib/bash-security";

const safeCommand = validateCommand(params.command); // 不安全会 throw
```

**被禁止的模式：** `rm -rf /`、`mkfs`、`dd if=`、`> /dev/`、`shutdown`、`reboot`

### File 模块

文件操作受 `path-security.ts` 限制，只能在允许的根路径内操作。

### 通用原则

- 永远不要在 handler 中硬编码密钥或 token
- 用户输入必须校验（params 类型检查由 TypeScript 编译保证）
- 错误信息不要暴露内部实现细节

---

## 测试规范

### TDD 流程

1. **先写测试**：定义期望行为
2. **实现 handler**：让测试通过
3. **重构**：保持测试通过

### 测试模式

使用 `mockServer` 模式（所有现有测试一致）：

```typescript
// 1. 创建 mock server
const mockServer = {
	register: vi.fn((method, handler) => {
		registeredHandlers[method] = handler;
	}),
	emitEvent: vi.fn(),
};

// 2. 导入并注册
const { register } = await import("../xxx");
register(mockServer as unknown as RPCServer, { platform: "web" });

// 3. 直接调用 handler 测试
const result = await registeredHandlers["xxx.list"]({});
```

### 测试覆盖要点

- [ ] 所有方法都正确注册
- [ ] 正常路径（CRUD 全覆盖）
- [ ] 边界情况（空列表、不存在的 ID）
- [ ] 错误处理（throw 场景）
- [ ] 事件推送（如有 `emitEvent` 调用）
- [ ] `vi.resetModules()` 在 `beforeEach` 中确保测试隔离

---

## 常见错误和避坑

### 1. 忘记在 `rpc-schema.ts` 中 extends

```typescript
// ❌ 忘记了
export interface RPCMethods extends AnyMethods, SystemMethods /* 缺少 XxxMethods */ {}

// ✅ 正确
export interface RPCMethods extends AnyMethods, SystemMethods, /* ... */ XxxMethods {}
```

### 2. 方法前缀与文件名不匹配

```typescript
// 文件名：modules/todo.ts
// ❌ ESLint 报错：方法前缀不匹配模块名
export interface TodoMethods {
  "task.list": { ... };  // "task" ≠ "todo"
}

// ✅ 正确
export interface TodoMethods {
  "todo.list": { ... };
}
```

### 3. handler 函数名不是 `register`

```typescript
// ❌ barrel export 失败
export function registerTodoHandlers(...) { }

// ✅ 必须命名为 register
export function register(server: RPCServer, options: HandlerOptions): void { }
```

### 4. 直接在入口文件注册 handler

```typescript
// ❌ 禁止：入口文件直接注册
import { registerXxxHandlers } from "./shared/handlers/xxx";
registerXxxHandlers(server);

// ✅ 通过 registerAllHandlers 自动发现
import { registerAllHandlers } from "./shared/register-all-handlers";
registerAllHandlers(server, { platform: "desktop" });
```

### 5. 前端绕过 apiClient

```typescript
// ❌ 禁止
const ws = new WebSocket(url);
ws.send(JSON.stringify({ method: "xxx.list", params: {} }));

// ✅ 正确
const result = await apiClient.call("xxx.list", {});
```

### 6. 测试中忘记 `vi.resetModules()`

不 reset 会导致模块缓存，状态在测试间泄漏。

---

## 完整调用链路

```
类型层:   modules/xxx.ts ──→ rpc-schema.ts (extends 合并)
                                  │
实现层:   handlers/xxx.ts ←───────┤ (类型约束 RPCMethods)
                │
注册层:   handlers/index.ts ←────┤ (barrel export)
          register-all-handlers.ts (Object.values 自动发现)
                │
入口层:   ┌─ bun/index.ts ─── registerAllHandlers(server, { platform: "desktop" })
         └─ server.ts ─────── registerAllHandlers(server, { platform: "web" })
                                     │
调用层:   api-client.ts ←────────────┘ (createTypedClient<RPCMethods, RPCEvents>)
                │
                └── 组件 / Store
                      apiClient.call("xxx.list", {})
                      apiClient.subscribe("xxx.changed", handler)
```

---

## 参考文件

- `references/rpc-api-reference.md` — 完整 RPC API 文档精简版
- `references/module-template.md` — 新模块完整代码模板
