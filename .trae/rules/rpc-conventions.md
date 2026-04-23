# RPC 模块化规范

> 本规范为 **强制规则**，所有 RPC 相关代码必须严格遵守。
> 违反规范的代码将被 ESLint 拒绝，无法通过 pre-commit 检查。

---

## 1. 目录结构

```
src/shared/
  modules/                  ← 模块定义目录（只允许在此处定义方法）
    system.ts               ← system.* 方法
    file.ts                 ← file.* 方法
    timer.ts                ← timer.* 方法
    <module>.ts             ← 新模块按此格式添加
  rpc-schema.ts             ← 唯一合并入口（禁止在此直接定义方法）
  typed-handlers.ts         ← 类型安全的注册器（禁止修改）
```

**规则**：
- 方法定义 **只允许** 在 `src/shared/modules/*.ts` 中
- `rpc-schema.ts` **只做合并**，不允许直接定义方法
- `typed-handlers.ts` 是底层工具，**禁止修改**

---

## 2. 方法命名规范

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

**模块名规范**：
- 全小写，camelCase：`system`、`file`、`timer`、`chat`、`storage`
- 命名应体现业务领域，而非技术实现

**动作名规范**：
- camelCase：`listDir`、`sendMessage`、`getConfig`
- 使用动词开头：`list`、`get`、`create`、`update`、`delete`、`start`、`stop`

---

## 3. 模块定义模板

每个模块文件 `src/shared/modules/<module>.ts` 必须遵循：

```typescript
/**
 * <Module> 模块 — <简短描述>
 */

// 方法定义
export interface <Module>Methods {
  "<module>.<action1>": {
    params: { /* 参数类型 */ };
    result: { /* 返回值类型 */ };
  };
  "<module>.<action2>": {
    params: { /* 参数类型 */ };
    result: { /* 返回值类型 */ };
  };
}

// 事件定义（可选，只有该模块有事件时才需要）
export interface <Module>Events {
  "<eventName>": { /* 事件载荷类型 */ };
}
```

**示例**：

```typescript
// src/shared/modules/chat.ts
export interface ChatMethods {
  "chat.send": {
    params: { content: string; channel?: string };
    result: { id: string; timestamp: number };
  };
  "chat.list": {
    params: { channel: string; limit?: number };
    result: { messages: Array<{ id: string; content: string; timestamp: number }> };
  };
}

export interface ChatEvents {
  "chat.message": { id: string; content: string; sender: string; timestamp: number };
}
```

---

## 4. Schema 合并（rpc-schema.ts）

新增模块时，**必须**在此文件中合并：

```typescript
import type { AnyMethods } from "@chat-agent/rpc-core";
import type { SystemMethods } from "./modules/system";
import type { FileMethods } from "./modules/file";
import type { TimerMethods, TimerEvents } from "./modules/timer";
import type { ChatMethods, ChatEvents } from "./modules/chat";  // ← 新增

// 方法合并
export interface RPCMethods extends AnyMethods, SystemMethods, FileMethods, TimerMethods, ChatMethods {}

// 事件合并
export interface RPCEvents extends TimerEvents, ChatEvents {}
```

**规则**：
- 每新增一个模块，必须在对应 `extends` 链中添加
- 禁止在 `RPCMethods` / `RPCEvents` 中直接定义属性

---

## 5. 后端注册规范

### 5.1 必须使用 createTypedRegister

```typescript
import { createTypedRegister } from "../shared/typed-handlers";

const register = createTypedRegister(server);

// ✅ 正确：使用 typed register，params 和 result 自动推导
register("system.ping", async () => {
  return { pong: true, timestamp: Date.now(), platform: "desktop" };
});

// ❌ 禁止：直接使用 server.register()
server.register("system.ping", async (params: unknown) => { ... });
```

### 5.2 桌面端注册（bun/index.ts）

```typescript
import { RPCServer } from "@chat-agent/rpc-core";
import { ElectrobunTransport } from "../gateway/ipc-transport";
import { createTypedRegister } from "../shared/typed-handlers";

const transport = new ElectrobunTransport();
const server = new RPCServer(transport);
const register = createTypedRegister(server);

register("system.ping", async () => ({ ... }));
register("file.listDir", async (params) => {
  // params 自动推导为 { path: string }
  return { entries, basePath };
});

// 事件推送
server.emitEvent("tick", { count, timestamp: Date.now() });
```

### 5.3 Web 端注册（server.ts）

```typescript
function registerSharedHandlers(rpcServer: RPCServer) {
  const register = createTypedRegister(rpcServer);
  register("system.ping", async () => ({ ... }));
  register("file.listDir", async (params) => { ... });
}

// 每个 WS 连接调用
wss.on("connection", (ws, req) => {
  const rpcServer = new RPCServer(wsTransport as Transport);
  registerSharedHandlers(rpcServer);

  // 连接级 handler
  const register = createTypedRegister(rpcServer);
  register("timer.start", async () => { ... });
});
```

---

## 6. 前端调用规范

### 6.1 必须使用 apiClient

```typescript
import { apiClient } from "./lib/api-client";
import type { RPCMethods } from "./lib/api-client";

// ✅ 正确：通过 apiClient.call()，params 和 result 自动推导
const res = await apiClient.call("system.ping", {});
const dir = await apiClient.call("file.listDir", { path: "/home" });

// ✅ 正确：访问嵌套类型
type Entries = RPCMethods["file.listDir"]["result"]["entries"];

// ❌ 禁止：绕过 apiClient 直接调用 WebSocket
websocket.send(JSON.stringify({ method: "system.ping" }));

// ❌ 禁止：使用裸方法名
apiClient.call("ping", {});           // → 缺少模块前缀
apiClient.call("listDir", { path: "." }); // → 缺少模块前缀
```

### 6.2 事件订阅

```typescript
// 订阅
const subId = await apiClient.subscribe("timer.tick", (payload) => {
  // payload 自动推导为 { count: number; timestamp: number }
  console.log(payload.count);
}, {});

// 取消订阅
apiClient.unsubscribe(subId);
```

### 6.3 类型引用

需要引用特定方法的类型时，使用括号访问：

```typescript
// ✅ 正确
type PingResult = RPCMethods["system.ping"]["result"];
type ListDirParams = RPCMethods["file.listDir"]["params"];

// ❌ 禁止：使用点访问
type PingResult = RPCMethods.system.ping.result;  // TS 不支持
```

---

## 7. 新增方法完整流程

### Step 1: 定义方法

在 `src/shared/modules/<module>.ts` 中添加：

```typescript
export interface FileMethods {
  "file.listDir": { ... };      // 已有
  "file.readFile": {            // ← 新增
    params: { path: string; encoding?: string };
    result: { content: string; size: number };
  };
}
```

### Step 2: 后端注册

在 `bun/index.ts` 和/或 `server.ts` 中：

```typescript
register("file.readFile", async (params) => {
  // params.path 自动推导为 string
  // params.encoding 自动推导为 string | undefined
  const content = await readFile(params.path, params.encoding || "utf-8");
  const s = await stat(params.path);
  return { content, size: s.size };  // 返回值自动检查类型
});
```

### Step 3: 前端调用

```typescript
const res = await apiClient.call("file.readFile", {
  path: "/etc/hosts",
  encoding: "utf-8",
});
// res.content: string ← 自动推导
// res.size: number    ← 自动推导
```

**无需任何额外配置** — 定义一遍，全部自动推导。

---

## 8. 错误溯源关键词表

当错误发生时，通过方法名前缀定位模块和文件：

| 方法前缀 | 模块文件 | 后端注册位置 | 说明 |
|----------|---------|-------------|------|
| `system.*` | `modules/system.ts` | `bun/index.ts` + `server.ts` 的 `registerSharedHandlers` | 基础连通性 |
| `file.*` | `modules/file.ts` | `bun/index.ts` + `server.ts` 的 `registerSharedHandlers` | 文件系统操作 |
| `timer.*` | `modules/timer.ts` | `bun/index.ts` + `server.ts` 的 WS connection handler | 定时器 & 事件 (timer.tick) |
| `chat.*` | `modules/chat.ts` | 按业务需要 | 聊天功能 |
| `storage.*` | `modules/storage.ts` | 按业务需要 | 存储操作 |

**错误追踪流程**：
1. 错误消息中提取方法名 → 如 `"file.listDir"`
2. 取 `.` 前缀 → `"file"`
3. 查表 → 模块定义 `modules/file.ts`，后端注册在 `registerSharedHandlers`
4. 定位到具体 handler 函数

---

## 9. 禁止事项清单

| 编号 | 禁止行为 | ESLint 规则 |
|------|---------|-------------|
| R1 | 使用裸方法名（无模块前缀） | `rpc/no-bare-method` |
| R2 | 直接调用 `server.register()` | `rpc/no-direct-register` |
| R3 | 在 `rpc-schema.ts` 中直接定义方法 | `rpc/schema-merge-only` |
| R4 | 模块文件缺少 `*Methods` 导出或方法前缀不匹配 | `rpc/module-file-naming` |
| R5 | 调用 `register()` 但未导入 `createTypedRegister` | `rpc/require-typed-register` |
| R6 | 前端绕过 `apiClient` 直接操作 WebSocket | `rpc/require-api-client` |

---

## 10. 完整调用链路图

```
定义层:    modules/system.ts ──→ rpc-schema.ts (合并)
                                      │
注册层:    typed-handlers.ts ←────────┘ (类型绑定)
               │
               ├── bun/index.ts     (桌面端 IPC)
               │     register("system.ping", handler)
               │
               └── server.ts        (Web 端 WebSocket)
                     register("system.ping", handler)
                      │
调用层:    api-client.ts ←───────────┘ (类型绑定)
               │
               └── App.tsx / 其他组件
                     apiClient.call("system.ping", {})
                     apiClient.subscribe("tick", handler)
```

每层的类型全部从 `rpc-schema.ts` 自动推导，**零额外配置**。
