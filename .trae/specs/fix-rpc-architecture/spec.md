# RPC 架构修复与底层服务建设 Spec

## Why
当前模板的 RPC 调用存在两个关键问题：
1. **Web 端**：每次 RPC 调用后 WebSocket 连接即断开，无法保持持久通道。原因：未使用 rpc-core 的 `WebSocketTransport`，未调用 `connect()` 建立持久连接。
2. **桌面端**：IPC 通道不通，RPC 请求无响应。原因：消息通道名称错误，且未使用完整的 rpc-server 架构。

同时，需要从原始项目（`my-react-tailwind-vite-app2`）中提炼通用代码，沉淀为 `packages/rpc-core` 的底层服务，供模板直接复用。

## What Changes

### A. 底层服务建设（从原始项目迁移）

将以下代码从原始项目迁移到 `packages/rpc-core/src/services/`：

| 原项目路径 | 目标路径 | 说明 |
|-----------|---------|------|
| `src/gateway/ipc-transport.ts` | `rpc-core/src/transports/electrobun.ts` | ElectrobunTransport（已存在，需核对） |
| `src/gateway/rpc-server.ts` | `rpc-core/src/services/rpc-server.ts` | TypedServer 创建与 handlers 注册 |
| `src/gateway/desktop.ts` | `rpc-core/src/services/desktop-server.ts` | 桌面端 server 工厂函数 |

### B. Web 端修复
- 使用 rpc-core 的 `WebSocketTransport` 替代自定义 rpc-browser.js
- 显式调用 `transport.connect()` 建立持久连接
- 连接断开后自动重连（带惩罚性延迟）

### C. 桌面端 IPC 修复
- 修正消息通道名称：发送用 `'message'`，接收用 `'rpc-message'`
- 使用 `createDesktopServer()` 工厂函数（从 rpc-core 导入）
- 双向消息流：webview ↔ desktop 通过 ElectrobunTransport

### D. 订阅功能
- 服务端支持 `subscribe` / `unsubscribe` 消息类型
- 支持事件推送机制
- TypedRPCServer 处理 `emit('event', ...)` 推送到订阅客户端

## Impact
- 受影响能力：RPC 调用、订阅推送、IPC 通信
- 受影响代码：
  - `template/src/mainview/main.tsx` - Web 端初始化
  - `template/src/bun/index.ts` - 桌面端 IPC 入口
  - `template/src/server.ts` - WebSocket 服务器
  - `packages/rpc-core/src/services/` - 新增服务层代码

## ADDED Requirements

### Requirement: Web 端持久 WebSocket 连接
Web 端的 `BrowserTransport` 必须建立持久连接，不在每次调用后断开。

#### Scenario: 连接建立
- **WHEN** `apiClient.initialize()` 被调用
- **THEN** `WebSocketTransport.connect()` 被调用，WebSocket 保持 OPEN 状态

#### Scenario: 连接断开重连
- **WHEN** WebSocket 因网络问题断开
- **THEN** BrowserTransport 自动重连，延迟从 3s 开始，失败后递增（惩罚性重试）

### Requirement: 订阅与事件推送
客户端可订阅服务端事件，服务端可向订阅者推送事件。

#### Scenario: 订阅事件
- **WHEN** 客户端调用 `client.subscribe('eventType', handler, filter)`
- **THEN** 服务端收到 `subscribe` 消息，注册订阅；后续服务端 `emit('event', ...)` 时推送给客户端

#### Scenario: 取消订阅
- **WHEN** 客户端调用 `client.unsubscribe(subscriptionId)`
- **THEN** 服务端移除该订阅，不再推送

### Requirement: 桌面端 IPC 双向通信
桌面端 webview 与桌面进程之间通过正确的通道双向传递 RPC 消息。

#### Scenario: webview → desktop
- **WHEN** webview 调用 `transport.send(message)`
- **THEN** 消息通过 `window.__electrobunBunBridge.postMessage()` 发送到桌面端

#### Scenario: desktop → webview
- **WHEN** 桌面进程处理完 RPC 请求
- **THEN** 通过 `webView.send('message', JSON.stringify(response))` 发回 webview

### Requirement: 底层服务导出
rpc-core 包应导出桌面端和 Web 端的 server 工厂函数，供模板直接使用。

#### Scenario: 桌面端创建 server
- **WHEN** 模板 `src/bun/index.ts` 调用 `createDesktopServer()`
- **THEN** 返回 `{ server, transport, rpc }`，其中 server 已注册 ping/hello/echo/listDir handlers

## MODIFIED Requirements

### Requirement: RPC 调用（已存在，需修复）
客户端通过 `client.call(method, params)` 调用服务端方法，服务端返回结果。

#### Scenario: 正常调用
- **WHEN** 客户端调用 `client.call('ping', {})`
- **THEN** 服务端 handler 被调用，返回 `{ pong: true, timestamp: ..., platform: ... }`

#### Scenario: 方法不存在
- **WHEN** 客户端调用 `client.call('nonExistent', {})`
- **THEN** 服务端返回 error `{ code: 404, message: 'Method not found: nonExistent' }`

## REMOVED Requirements

### Requirement: 自定义 rpc-browser.js
**Reason**: 已被 rpc-core 的 `BrowserTransport` 替代
**Migration**: 删除 `template/src/mainview/rpc-browser.js`，不再使用
