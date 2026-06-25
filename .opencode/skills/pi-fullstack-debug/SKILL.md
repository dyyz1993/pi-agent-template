---
name: pi-fullstack-debug
version: "1.0.0"
description: >
  Pi Agent 全栈调试指南。从前端到 RPC 通信到后端的完整调试链路。
  当用户遇到"接口调用失败"、"WebSocket 断连"、"功能不工作"、"数据不对"、
  "页面白屏"、"组件不渲染"、"报错了"等调试场景时使用此 Skill。
  也适用于排查性能问题、内存泄漏、连接超时等问题。
---

# Pi Agent 全栈调试指南

## 全栈调用链路

```
用户操作
  → React 组件（templates/agent/src/mainview/）
    → Store action（templates/agent/src/mainview/stores/）
      → apiClient.call()（templates/agent/src/mainview/lib/api-client.ts）
        → RPCClient（@dyyz1993/rpc-core）
          → Transport 层（WebSocket / IPC）
            → Server Handler（templates/agent/src/gateway/）
              → 业务逻辑 → 文件系统 / Git / Bash
```

关键文件：

| 层级           | 文件                                                          | 职责                                |
| -------------- | ------------------------------------------------------------- | ----------------------------------- |
| API 客户端     | `templates/agent/src/mainview/lib/api-client.ts`              | RPC 调用入口，自动选择 IPC/WS       |
| RPC 缓存       | `templates/agent/src/mainview/lib/rpc-cache.ts`               | GET 类方法缓存（TTL 2-5s）          |
| 连接管理       | `templates/agent/src/mainview/stores/use-connection-store.ts` | 连接初始化、重试、状态              |
| WebSocket 传输 | `packages/rpc-core/src/transports/websocket.ts`               | WS 连接、心跳、重连                 |
| 服务端入口     | `templates/agent/src/server.ts`                               | HTTP + WS 网关，端口自动协商        |
| WS 处理        | `templates/agent/src/gateway/ws-handler.ts`                   | 认证、方法路由、事件推送            |
| HTTP 路由      | `templates/agent/src/gateway/http-routes.ts`                  | 文件端点 /file/{path}, /info/{path} |
| 路径安全       | `templates/agent/src/shared/lib/path-security.ts`             | 沙箱限制，防止路径穿越              |
| Bash 安全      | `templates/agent/src/shared/lib/bash-security.ts`             | 命令黑名单，危险命令拦截            |
| RPC Schema     | `templates/agent/src/shared/rpc-schema.ts`                    | 所有方法和事件的类型定义            |

## 常见问题分类与排查

### 1. 前端渲染问题

**症状：** 白屏、组件不显示、UI 不更新

排查步骤：

1. **打开 DevTools Console** — 检查是否有 React 错误或未捕获异常
2. **检查 Store 状态** — `useXxxStore.getState()` 在 Console 中查看当前状态
3. **检查连接状态** — `useConnectionStore.getState()` 确认 `ready: true`
4. **检查 CSS 变量** — 白屏可能是主题变量缺失，确认 `index.css` 中 `:root` 和 `.dark` 都有定义
5. **检查 i18n** — 文本不显示可能是 key 缺失，查看 Console 中的 i18n fallback 警告

常见原因：

- Store 未初始化（`initializeConnection` 未调用）
- 条件渲染依赖的 state 为 null/undefined
- CSS 变量未在两个主题中定义

### 2. RPC 连接问题

**症状：** "Connecting to RPC server..." 一直转、接口超时、WebSocket 断连

排查步骤：

1. **确认后端启动** — 检查 `.server-port` 文件是否存在，内容是否为有效端口
   ```bash
   cat .server-port  # 应输出端口号如 3100
   curl http://localhost:$(cat .server-port)/health  # 应返回 {"status":"ok"}
   ```
2. **检查 WebSocket 连接** — DevTools → Network → WS 面板，查看连接状态和消息
3. **检查 Token** — URL query `?token=` / localStorage `rpc-auth-token` / 默认值 `pi-agent-template-token`
4. **检查端口冲突** — `lsof -i :3100-3110`，可能有残留进程
5. **检查 Vite 代理**（web 模式）— `vite.config.ts` 中 `/ws` 代理的 `rewrite` 规则是否正确
6. **检查重连逻辑** — `WebSocketTransport` 默认最多重连 10 次，指数退避 3s→30s

常见原因：

- 后端未启动或端口冲突（`findAvailablePort` 从 3100 开始尝试）
- Token 不匹配（前端 Token ≠ 服务端配置的 Token）
- Vite 代理路径不匹配（`/ws` → `/` rewrite 缺失）
- 多个 Bun 进程残留导致端口被占用

### 3. 后端 Handler 问题

**症状：** "Method not found"、参数错误、返回 null

排查步骤：

1. **查看可用方法** — 服务端启动时日志打印 `Available RPC methods: ...`
2. **检查 rpc-schema.ts** — 确认方法名和参数类型是否匹配
3. **检查 Handler 注册** — `shared/register-all-handlers.ts` 确认 handler 已注册
4. **查看服务端日志** — 日志目录由 `server-config.ts` 的 `logDir` 决定
5. **直接 WS 测试** — 用 `websocat` 发送 JSON-RPC 消息测试

### 4. 安全拦截

**症状：** "Access denied: path outside allowed roots"、"Command blocked for safety"

**路径安全** (`path-security.ts`)：

- 只允许访问 `allowedRoots` 下的路径（默认 `process.cwd()`）
- 拦截 null bytes、路径穿越（`../`）
- `validatePath()` 会在 resolve 后检查是否在允许范围内

**Bash 安全** (`bash-security.ts`)：

- 黑名单模式：`rm -rf /`、`mkfs`、`dd if=`、`shutdown`、`reboot`、fork bomb 等
- 可选白名单模式：设置 `allowedCommands` 后只允许指定命令
- `isCommandAllowed()` 先检查黑名单再检查白名单

排查：

```typescript
import { isRpcPathAllowed, setAllowedRoots } from "../shared/lib/path-security";
import { isCommandAllowed, setCommandPolicy } from "../shared/lib/bash-security";

// 调试路径
isRpcPathAllowed("/some/path"); // false 说明被拦截
setAllowedRoots(["/expanded/path"]); // 扩展允许范围

// 调试命令
isCommandAllowed("rm -rf /tmp/test"); // 检查是否被拦截
```

### 5. 状态管理问题

**症状：** 数据不对、重复渲染、状态不更新

排查：

1. **Console 中查看 Store** — `useXxxStore.getState()`
2. **检查订阅** — 确认组件用 selector 订阅正确的 state slice
3. **检查缓存** — `rpcCache` 默认 TTL 2s，可缓存的方法见 `CACHEABLE_METHODS`
   - `file.listDir`: 2s, `file.readFile`: 3s, `git.status`: 2s, `git.branches`: 5s
4. **手动清除缓存** — `rpcCache.clear()` 或 `rpcCache.invalidate("method.name")`。批量失效用 `rpcCache.invalidateAll(["method.a", "method.b"])`

### 6. 性能问题

**症状：** UI 卡顿、内存持续增长

排查：

1. **React DevTools Profiler** — 检查慢渲染组件
2. **检查 Bash 输出** — 长时间运行的命令输出会无限累积，考虑截断
3. **检查 Chat 消息** — 长对话的消息列表可能很大，确认有虚拟化
4. **检查 RPC 缓存** — `rpcCache.prune()` 清理过期条目（默认 TTL × 10 后清理）
5. **检查事件订阅** — 确认组件卸载时调用了 `apiClient.unsubscribe()`

## 调试工具

### 单元测试（Bun test）

```bash
bun test                          # 运行所有测试
bun test tests/path/to/test.ts   # 运行特定测试
```

用于测试后端 Handler、安全模块、工具函数。

### 组件测试（Vitest）

```bash
npx vitest                        # 运行所有
npx vitest path/to/test.tsx       # 运行特定文件
```

用于测试 React 组件、Store、前端工具函数。

### E2E 测试（Playwright）

```bash
# 需要先启动后端
bun run dev                       # 启动 Vite + Backend
npx playwright test               # 运行 E2E
```

**E2E 无后端 Mock 方案：** E2E 测试依赖真实后端。如果只想测试 UI，可：

1. 启动真实后端 `bun run server.ts`
2. 或用 MSW 拦截 WS 消息（复杂，不推荐）
3. 或在测试 setup 中 mock `apiClient` 模块

### DevTools

- **React 面板**：查看组件树、props、state
- **Network → WS**：查看 WebSocket 消息收发
- **Console**：
  ```javascript
  // 检查连接
  useConnectionStore.getState();
  // 检查任意 Store
  useXxxStore.getState();
  // 清除 RPC 缓存
  rpcCache.clear();
  // 检查 API client 状态
  apiClient.isConnected();
  apiClient.getTransport();
  ```

## 安全机制

### Token 认证流程

1. 前端从 URL query / localStorage / 默认值获取 Token
2. WebSocket 连接时通过 `?token=xxx` 传递
3. 服务端 `ws-handler.ts` 在 upgrade 时验证 Token
4. Token 不匹配则拒绝连接

### Path Security

- 白名单机制：只允许 `allowedRoots` 下的路径
- 防御：null bytes、路径穿越、符号链接
- 默认 `allowedRoots = [process.cwd()]`

### Bash Command Security

- 黑名单 + 可选白名单
- 默认黑名单：`rm -rf /`、`mkfs`、`dd`、`shutdown`、`reboot`、fork bomb 等
- 可通过 `setCommandPolicy()` 自定义

## 已知问题速查

详见 [references/known-issues.md](references/known-issues.md)

| 问题                | 症状                       | 快速修复                                    |
| ------------------- | -------------------------- | ------------------------------------------- |
| WS 重连后订阅丢失   | 重连后事件不推送           | 需在 `onReconnect` 中重新订阅               |
| Bash 输出无限增长   | BashPanel 卡顿             | 截断输出或限制缓冲区                        |
| 端口冲突            | 启动失败 / 连接失败        | 清理残留进程 `kill $(lsof -t -i:3100-3110)` |
| Vite 代理路径不匹配 | 永远显示 "Connecting..."   | 确认 `vite.config.ts` 的 rewrite 规则       |
| 长对话卡顿          | ChatPanel 渲染慢           | 消息虚拟化或限制显示条数                    |
| E2E 多 agent 干扰   | 浏览器页面跳转 about:blank | 用隔离 `AGENT_BROWSER_SOCKET_DIR`           |
