# RPC 模块化规范（单注册架构）

> 本规范为 **强制规则**，所有 RPC 相关代码必须严格遵守。
> 违反规范的代码将被 ESLint 拒绝，无法通过 pre-commit 检查。

---

## 1. 核心原则

**Handler 只注册一遍，两个入口点（桌面端/Web 端）自动共享。**

新增 RPC 方法只需三步：
1. 在 `modules/` 添加类型定义
2. 在 `handlers/` 添加 handler 实现
3. 在 `register-all-handlers.ts` 中注册

入口文件（`bun/index.ts`, `server.ts`）**无需任何修改**。

---

## 2. 目录结构

```
src/shared/
  modules/                    ← 模块类型定义（只允许在此处定义方法类型）
    system.ts                 ← system.* 方法类型
    file.ts                   ← file.* 方法类型
    timer.ts                  ← timer.* 方法类型 + timer.tick 事件类型
    <module>.ts               ← 新模块按此格式添加
  handlers/                   ← Handler 实现（只允许在此处写 handler 逻辑）
    system.ts                 ← system.* handler 实现
    file.ts                   ← file.* handler 实现
    timer.ts                  ← timer.* handler 实现
    <module>.ts               ← 新模块按此格式添加
  rpc-schema.ts               ← 唯一类型合并入口
  register-all-handlers.ts    ← 唯一 handler 注册入口
```

**规则**：
- 方法类型 **只允许** 在 `src/shared/modules/*.ts` 中定义
- Handler 实现 **只允许** 在 `src/shared/handlers/*.ts` 中编写
- `rpc-schema.ts` **只做类型合并**
- `register-all-handlers.ts` **只做 handler 注册编排**
- 入口文件（`bun/index.ts`, `server.ts`）**禁止直接注册 handler**

---

## 3. 方法命名规范

格式：`"<模块名>.<动作名>"`（点分隔）

```
system.ping        ✅ 正确
system.hello       ✅ 正确
file.listDir       ✅ 正确
timer.start        ✅ 正确

ping               ❌ 禁止：缺少模块前缀
listDir            ❌ 禁止：缺少模块前缀
filelistDir        ❌ 禁止：缺少点分隔符
file-listDir       ❌ 禁止：使用连字符而非点
```

---

## 4. 模块定义模板

### 4.1 类型定义（modules/<module>.ts）

```typescript
/**
 * <Module> 模块 — <简短描述>
 */
export interface <Module>Methods {
  "<module>.<action>": {
    params: { /* 参数类型 */ };
    result: { /* 返回值类型 */ };
  };
}

// 事件定义（可选）
export interface <Module>Events {
  "<module>.<event>": { /* 事件载荷类型 */ };
}
```

### 4.2 Handler 实现（handlers/<module>.ts）

```typescript
import type { RPCServer } from "@chat-agent/rpc-core";
import type { MethodParams, MethodResult } from "@chat-agent/rpc-core";
import type { RPCMethods } from "../rpc-schema";

type RegisterFn = <K extends keyof RPCMethods & string>(
  method: K,
  handler: (params: MethodParams<RPCMethods, K>) => Promise<MethodResult<RPCMethods, K>>,
) => void;

interface XxxOptions {
  // 模块特有配置（如 platform）
}

export function registerXxxHandlers(server: RPCServer, options?: XxxOptions): void {
  const register: RegisterFn = (method, handler) => {
    server.register(method, handler as (params: unknown) => Promise<unknown>);
  };

  register("xxx.action", async (params) => {
    // params 和返回值自动推导
    return { ... };
  });
}
```

---

## 5. 注册编排（register-all-handlers.ts）

```typescript
import type { RPCServer } from "@chat-agent/rpc-core";
import { registerSystemHandlers } from "./handlers/system";
import { registerFileHandlers } from "./handlers/file";
import { registerTimerHandlers } from "./handlers/timer";

interface HandlerOptions {
  platform: "desktop" | "web";
}

export function registerAllHandlers(server: RPCServer, options: HandlerOptions): void {
  registerSystemHandlers(server, options);
  registerFileHandlers(server);
  registerTimerHandlers(server);
}
```

新增模块时，只需在此添加一行 `registerXxxHandlers(server)` 调用。

---

## 6. 入口文件规范

### 6.1 桌面端（bun/index.ts）

```typescript
import { RPCServer } from "@chat-agent/rpc-core";
import { ElectrobunTransport } from "../gateway/ipc-transport";
import { registerAllHandlers } from "../shared/register-all-handlers";

const transport = new ElectrobunTransport();
const server = new RPCServer(transport);
registerAllHandlers(server, { platform: "desktop" });
```

### 6.2 Web 端（server.ts）

```typescript
import { registerAllHandlers } from "./shared/register-all-handlers";

// 每个 WS 连接
wss.on("connection", (ws, req) => {
  const rpcServer = new RPCServer(wsTransport as Transport);
  registerAllHandlers(rpcServer, { platform: "web" });
});
```

---

## 7. 前端调用规范

### 7.1 必须使用 apiClient

```typescript
import { apiClient } from "./lib/api-client";

// ✅ 正确：通过 apiClient.call()
const res = await apiClient.call("system.ping", {});
const dir = await apiClient.call("file.listDir", { path: "/home" });

// ❌ 禁止：绕过 apiClient 直接操作 WebSocket
```

### 7.2 事件订阅

```typescript
const subId = await apiClient.subscribe("timer.tick", (payload) => {
  console.log(payload.count);
}, {});
apiClient.unsubscribe(subId);
```

---

## 8. 新增方法完整流程

### Step 1: 定义类型

在 `src/shared/modules/<module>.ts` 中添加方法类型。

### Step 2: 实现 Handler

在 `src/shared/handlers/<module>.ts` 中添加 handler 实现。

### Step 3: 注册

在 `src/shared/register-all-handlers.ts` 中调用 `registerXxxHandlers(server)`。

**完成。** 两个入口点自动获得新方法，无需修改 `bun/index.ts` 或 `server.ts`。

---

## 9. 错误溯源关键词表

| 方法前缀 | 类型文件 | Handler 文件 | 说明 |
|----------|---------|-------------|------|
| `system.*` | `modules/system.ts` | `handlers/system.ts` | 基础连通性 |
| `file.*` | `modules/file.ts` | `handlers/file.ts` | 文件系统操作 |
| `timer.*` | `modules/timer.ts` | `handlers/timer.ts` | 定时器 & 事件 (timer.tick) |

---

## 10. 禁止事项清单

| 编号 | 禁止行为 | ESLint 规则 |
|------|---------|-------------|
| R1 | 使用裸方法名（无模块前缀） | `rpc/no-bare-method` |
| R2 | 入口文件直接调用 `server.register()` | `rpc/no-direct-register` |
| R3 | 在 `rpc-schema.ts` 中直接定义方法 | `rpc/schema-merge-only` |
| R4 | 模块文件缺少 `*Methods` 导出或方法前缀不匹配 | `rpc/module-file-naming` |
| R5 | 入口文件未导入 `registerAllHandlers` | `rpc/require-typed-register` |
| R6 | 前端绕过 `apiClient` 直接操作 WebSocket | `rpc/require-api-client` |

---

## 11. 完整调用链路图

```
类型层:   modules/system.ts ──→ rpc-schema.ts (合并类型)
                                     │
实现层:   handlers/system.ts ←───────┤ (类型约束)
               │
注册层:   register-all-handlers.ts ←─┘ (编排所有模块)
               │
入口层:   ┌─ bun/index.ts ─── registerAllHandlers(server, { platform: "desktop" })
          └─ server.ts ─────── registerAllHandlers(rpcServer, { platform: "web" })
                                      │
调用层:   api-client.ts ←─────────────┘ (类型绑定)
               │
               └── App.tsx / 其他组件
                     apiClient.call("system.ping", {})
                     apiClient.subscribe("timer.tick", handler)
```

**Handler 只实现一次，两个平台自动共享。**
