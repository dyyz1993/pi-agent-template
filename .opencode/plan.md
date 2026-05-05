# TDD 实施方案：Token 安全 + 订阅健壮性 + 混合模式

## 概述

基于 TDD（测试驱动开发）方式，按依赖顺序推进四个阶段：
Phase 0 → Phase 1 → Phase 2 → Phase 3

每个阶段：先写失败测试 → 写最小实现 → 测试通过 → 重构。

---

## Phase 0: 有状态 Handler 实例化改造（前置依赖）

### 问题

6 个 handler 使用模块级变量（单例状态），在混合模式下 IPC 和 WS 共享会冲突：

- `timer.ts`: `let timerId`
- `bash.ts`: `Map<number, TrackedProcess> processes` + `let pidCounter`
- `feed.ts`: `FeedPost[] posts`
- `todo.ts`: `TodoItem[] items` + `let todoIdCounter`
- `rules.ts`: `Rule[] rules` + `let ruleIdCounter`
- `chat.ts`: 依赖文件系统（无模块级变量，但需审查）

### 方案：工厂函数模式

将每个 handler 的 `register()` 函数从闭包捕获模块级变量，改为每次调用 `register()` 时创建独立的状态容器。

改造前：

```typescript
// timer.ts（改造前）
let timerId: ReturnType<typeof setInterval> | null = null;

export function register(server: RPCServer, options: HandlerOptions): void {
  server.register("timer.start", async () => {
    if (timerId) return { alreadyRunning: true };
    timerId = setInterval(() => { ... }, 1000);
    return { started: true };
  });
  server.register("timer.stop", async () => {
    if (!timerId) return { stopped: false };
    clearInterval(timerId);
    timerId = null;
    return { stopped: true };
  });
}
```

改造后：

```typescript
// timer.ts（改造后）
export function register(server: RPCServer, options: HandlerOptions): void {
  let timerId: ReturnType<typeof setInterval> | null = null; // 状态在 register 内部

  server.register("timer.start", async () => {
    if (timerId) return { alreadyRunning: true };
    timerId = setInterval(() => { ... }, 1000);
    return { started: true };
  });
  server.register("timer.stop", async () => {
    if (!timerId) return { stopped: false };
    clearInterval(timerId);
    timerId = null;
    return { stopped: true };
  });
}
```

### TDD 测试用例

#### 文件：`templates/agent/src/shared/handlers/__tests__/handler-isolation.test.ts`

```typescript
describe("Handler 隔离性", () => {
	it("timer: 两个独立的 RPCServer 各自维护独立的定时器状态");
	it("timer: server A 启动定时器不影响 server B");
	it("timer: server A 停止定时器不影响 server B");
	it("bash: 两个独立的 RPCServer 各自维护独立的进程列表");
	it("bash: server A 的 pidCounter 不影响 server B");
	it("feed: 两个独立的 RPCServer 各自维护独立的帖子列表");
	it("todo: 两个独立的 RPCServer 各自维护独立的 todo 列表");
	it("rules: 两个独立的 RPCServer 各自维护独立的规则列表");
	it("所有 handler: close 后状态被正确清理");
});
```

### 涉及文件

- `templates/agent/src/shared/handlers/timer.ts` — 移 `timerId` 到 register 内部
- `templates/agent/src/shared/handlers/bash.ts` — 移 `processes` + `pidCounter` 到 register 内部
- `templates/agent/src/shared/handlers/feed.ts` — 移 `posts` 到 register 内部
- `templates/agent/src/shared/handlers/todo.ts` — 移 `items` + `todoIdCounter` 到 register 内部
- `templates/agent/src/shared/handlers/rules.ts` — 移 `rules` + `ruleIdCounter` 到 register 内部
- 新增：`templates/agent/src/shared/handlers/__tests__/handler-isolation.test.ts`

---

## Phase 1: Token 安全增强

### 1.1 动态 Token 生成（混合模式）

桌面端混合模式下，每次启动自动生成随机 token，而不是使用硬编码默认值。

方案：`server-config.ts` 增加动态生成逻辑：

```typescript
import { randomUUID } from "crypto";

export const config = {
	authToken:
		process.env.AUTH_TOKEN ||
		(process.env.NODE_ENV === "production"
			? undefined // 生产环境必须设置，否则启动时报错
			: `dev-${randomUUID()}`), // 开发/混合模式自动生成
};
```

### 1.2 WS Token 从 URL Query 迁移到 Header

当前 WS 连接通过 `ws://host/ws?token=xxx` 传递 token（明文出现在 URL 中）。
改为通过 `Sec-WebSocket-Protocol` header 传递。

服务端 `ws-handler.ts`：

```typescript
// 改造前
const token = url?.searchParams.get("token");

// 改造后（兼容两种方式）
const headerToken = req.headers["sec-websocket-protocol"];
const queryToken = url?.searchParams.get("token");
const token = headerToken || queryToken;
```

前端 `WebSocketTransport`：

```typescript
// 改造后
const ws = new WebSocket(url, [token]); // token 作为 Sec-WebSocket-Protocol
```

### 1.3 生产环境强制 AUTH_TOKEN

```typescript
if (process.env.NODE_ENV === "production" && !process.env.AUTH_TOKEN) {
	throw new Error("[FATAL] AUTH_TOKEN must be set in production environment");
}
```

### TDD 测试用例

#### 文件：`templates/agent/src/gateway/__tests__/ws-handler-token.test.ts`

```typescript
describe("WS Token 安全", () => {
	it("无 token 连接应被拒绝（4001）");
	it("错误 token 应被拒绝（4001）");
	it("正确 token 通过 URL query 应被接受");
	it("正确 token 通过 Sec-WebSocket-Protocol header 应被接受");
	it("token 通过 header 传递时不出现在 URL 中");
	it("timingSafeEqual 防时序攻击（长度不等直接返回 false）");
});
```

#### 文件：`templates/agent/src/__tests__/server-config-security.test.ts`

```typescript
describe("Server Config 安全", () => {
	it("生产环境未设 AUTH_TOKEN 应抛出错误");
	it("开发环境未设 AUTH_TOKEN 应自动生成随机 token");
	it("显式设置 AUTH_TOKEN 应使用用户提供的值");
	it("自动生成的 token 每次不同");
});
```

#### 文件：`packages/rpc-core/src/transport/__tests__/websocket-token.test.ts`

```typescript
describe("WebSocketTransport Token", () => {
	it("连接时 token 通过 Sec-WebSocket-Protocol header 传递");
	it("兼容旧版 URL query 方式");
	it("重连时 token 不会泄露到日志中");
});
```

### 涉及文件

- `templates/agent/src/server-config.ts` — 动态 token + 生产强制
- `templates/agent/src/gateway/ws-handler.ts` — 支持 header token
- `packages/rpc-core/src/transport/websocket-transport.ts` — 通过 header 传递 token
- `templates/agent/src/mainview/lib/api-client.ts` — 前端适配
- 新增测试文件 3 个

---

## Phase 2: 订阅系统健壮性

### 2.1 emitEvent 无匹配订阅时日志警告

在 `RPCServer.emitEvent()` 中，当没有找到任何匹配的订阅时，记录 warn 日志。

```typescript
// packages/rpc-core/src/server.ts
async emitEvent(eventType, payload, metadata) {
  const event = { ... };
  let matchCount = 0;
  for (const [subId, sub] of this.subscriptions) {
    if (sub.eventType !== eventType) continue;
    if (matchFilter(event, sub.filter)) {
      matchCount++;
      break;
    }
  }
  if (matchCount === 0) {
    this.logger?.warn?.(`No matching subscription for event "${eventType}"`, { metadata });
  }
  if (matchCount > 0) {
    await this.transport.send(event);
  }
}
```

### 2.2 订阅诊断 RPC 方法

新增 `debug.subscriptions` 方法，让前端查询当前活跃的订阅：

在 `rpc-schema.ts` 中：

```typescript
interface DebugMethods {
	"debug.subscriptions": {
		input: {};
		output: {
			subscriptions: Array<{ id: string; eventType: string; filter: Record<string, unknown> }>;
		};
	};
}
```

在 `RPCServer` 中新增：

```typescript
getActiveSubscriptions(): Array<{ id: string; eventType: string; filter: Record<string, unknown> }> {
  return Array.from(this.subscriptions.entries()).map(([id, sub]) => ({
    id, eventType: sub.eventType, filter: sub.filter,
  }));
}
```

注册为 RPC 方法：

```typescript
server.register("debug.subscriptions", async () => ({
	subscriptions: server.getActiveSubscriptions(),
}));
```

### 2.3 心跳检测 + 订阅超时清理

在 WebSocketTransport 中增加 ping/pong 心跳：

- 服务端每 30s 发送 ping
- 客户端自动回复 pong
- 超时未收到 pong → 触发 onDisconnect → 清理订阅

### TDD 测试用例

#### 文件：`packages/rpc-core/tests/subscribe-robustness.test.ts`

```typescript
describe("订阅健壮性", () => {
	it("emitEvent 时无匹配订阅应记录 warn 日志");
	it("emitEvent 时有匹配订阅不应记录 warn");
	it("filter 字段名不匹配时应记录 warn（含期望的 metadata keys 和实际的 keys）");
	it("debug.subscriptions 返回当前所有活跃订阅");
	it("unsubscribe 后 debug.subscriptions 不包含该订阅");
	it("连接断开后 debug.subscriptions 返回空数组");
	it("重复 subscribe 相同 eventType + filter 只产生一个订阅");
	it("不同 filter 的相同 eventType 产生独立订阅");
});
```

#### 文件：`packages/rpc-core/tests/heartbeat.test.ts`

```typescript
describe("心跳检测", () => {
	it("服务端定时发送 ping");
	it("客户端收到 ping 自动回复 pong");
	it("服务端超时未收到 pong 触发 onDisconnect");
	it("onDisconnect 触发后清理所有订阅");
});
```

### 涉及文件

- `packages/rpc-core/src/server.ts` — emitEvent 日志 + getActiveSubscriptions
- `packages/rpc-core/src/transport/websocket-transport.ts` — 心跳
- `templates/agent/src/shared/rpc-schema.ts` — 新增 DebugMethods
- `templates/agent/src/shared/handlers/` — 新增 debug.ts handler
- `templates/agent/src/shared/handlers/index.ts` — 导出 debug
- 新增测试文件 2 个

---

## Phase 3: 混合模式（桌面端 + Web 服务）

### 3.1 核心改造

在 `bun/index.ts` 中，IPC 启动后可选择启动 HTTP/WS 服务：

```typescript
// bun/index.ts（改造后）
// 1. 现有 IPC 逻辑不变
const transport = new ElectrobunTransport();
const server = new RPCServer(transport);
registerAllHandlers(server, { platform: "desktop", enableBash: true });

// 2. 可选：启动 Web 服务
const enableWebService = config.enableWebService; // 新配置项
if (enableWebService) {
	const { createWebServer } = await import("../shared/lib/web-server");
	const { httpServer, wss, port, authToken } = createWebServer(config);
	const localIp = getLocalIP();
	log.info(`[Hybrid] 局域网访问: http://${localIp}:${port}?token=${authToken}`);
	// 可通过 RPC 事件通知前端显示连接信息
	server.emitEvent("hybrid.ready", { url: `http://${localIp}:${port}`, token: authToken });
}
```

### 3.2 抽取 Web 服务工厂

将 `server.ts` 的核心逻辑提取为 `createWebServer()` 工厂函数：

```typescript
// templates/agent/src/shared/lib/web-server.ts
export function createWebServer(config: ServerConfig): {
  httpServer: Server;
  wss: WebSocketServer;
  port: number;
  authToken: string;
} {
  const httpServer = createServer();
  const wss = createWsHandler(httpServer, { config });
  httpServer.on("request", createHttpHandler({ config, ... }));
  // 端口协商
  const port = findAvailablePort(config.port);
  return { httpServer, wss, port, authToken: config.authToken };
}
```

同时 `server.ts`（Web 入口）和 `bun/index.ts`（桌面入口）都调用这个工厂。

### 3.3 动态 Token + 安全

混合模式下每次启动生成随机 token：

```typescript
authToken: process.env.AUTH_TOKEN || `hybrid-${randomUUID()}`;
```

在桌面端 UI 中显示连接信息（URL + token），或生成二维码。

### 3.4 CORS 配置

新增环境变量：

```typescript
corsOrigin: process.env.CORS_ORIGIN || "*", // 混合模式默认允许所有来源
```

### TDD 测试用例

#### 文件：`templates/agent/src/shared/lib/__tests__/web-server.test.ts`

```typescript
describe("Web Server 工厂", () => {
	it("createWebServer 返回 httpServer + wss + port + authToken");
	it("端口冲突时自动递增");
	it("多个 WS 客户端各自拥有独立的 RPCServer 实例");
	it("IPC 客户端和 WS 客户端的 handler 状态隔离");
});
```

#### 文件：`templates/agent/src/__tests__/hybrid-mode.test.ts`

```typescript
describe("混合模式", () => {
	it("桌面端启动 IPC 后可选择启动 Web 服务");
	it("Web 服务启动后可通过 WS 连接");
	it("IPC 客户端和 WS 客户端可同时工作");
	it("WS 客户端需要 token 才能连接");
	it("IPC 客户端不需要 token");
	it("动态生成的 token 每次启动不同");
	it("关闭桌面端时 Web 服务也关闭");
	it("正确获取本机局域网 IP");
});
```

#### E2E 文件：`e2e/hybrid-mode.spec.ts`

```typescript
describe("混合模式 E2E", () => {
	it("桌面端启动后，局域网浏览器可连接并执行 RPC 调用");
	it("多个远程浏览器可同时连接");
	it("远程浏览器可通过 WS 订阅事件并接收推送");
	it("token 错误的浏览器被拒绝连接");
});
```

### 涉及文件

- 新增：`templates/agent/src/shared/lib/web-server.ts` — Web 服务工厂
- 修改：`templates/agent/src/bun/index.ts` — 混合模式入口
- 修改：`templates/agent/src/server.ts` — 复用 web-server 工厂
- 修改：`templates/agent/src/server-config.ts` — 新增 enableWebService 配置
- 新增测试文件 3 个

---

## 执行顺序与依赖关系

```
Phase 0 (Handler 实例化)
  │
  ├─── Phase 1 (Token 安全) ──── 无依赖，可并行
  │
  ├─── Phase 2 (订阅健壮性) ──── 无依赖，可并行
  │
  └─── Phase 3 (混合模式) ──── 依赖 Phase 0 + 1 + 2 全部完成
```

Phase 0 是 Phase 3 的硬前置依赖。
Phase 1 和 Phase 2 可以和 Phase 0 并行。

## 测试覆盖率目标

| 层级     | 工具         | 覆盖目标                                 |
| -------- | ------------ | ---------------------------------------- |
| RPC Core | `bun:test`   | transport token 传递、订阅生命周期、心跳 |
| Handlers | `vitest`     | 隔离性、状态管理、边界条件               |
| Gateway  | `vitest`     | token 校验、WS 连接生命周期              |
| Config   | `vitest`     | 安全策略、动态 token                     |
| 混合模式 | `vitest`     | web-server 工厂、状态隔离                |
| E2E      | `playwright` | 端到端混合模式场景                       |

## 风险与注意事项

1. **Handler 实例化改造可能影响现有测试**：现有测试用 `vi.resetModules()` 隔离，改造后可能不再需要
2. **Sec-WebSocket-Protocol 兼容性**：某些代理/CDN 可能 strip 这个 header，需保留 URL query fallback
3. **timer 状态隔离**：timer handler 内部用 `setInterval`，混合模式下多个连接可能创建多个定时器
4. **chat.ts 文件系统依赖**：虽然无模块级变量，但 `~/.pi-agent/chat-history.json` 是共享的，混合模式下多个连接会同时读写
5. **E2E 测试环境**：混合模式 E2E 需要 Electrobun 桌面端 + 浏览器同时运行，CI 环境可能不支持
