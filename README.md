# Pi Agent Template — AI Agent 桌面应用脚手架

[![npm version](https://img.shields.io/npm/v/@dyyz1993/create-agent.svg)](https://www.npmjs.com/package/@dyyz1993/create-agent)
[![license](https://img.shields.io/npm/l/@dyyz1993/create-agent.svg)](https://github.com/dyyz1993/pi-agent-template/blob/main/LICENSE)

Pi Agent Template 是一套用于构建 AI Agent 桌面应用的工程化脚手架。基于 Electrobun + React + Vite + Bun，内置 type-safe RPC 通信框架，支持并行开发工作流和 UI 自动化测试。

## Features

- **3 种模板类型** — general (全功能)、chat (对话型)、agent (编码 Agent)
- **Type-safe RPC 框架** — `@dyyz1993/rpc-core`，支持 request-response、pub-sub、streaming，自带 IPC / WebSocket / SSE / Stdio / In-Memory 传输层
- **并行开发工作流** — `create-agent workspace add` 创建隔离工作区，多实例同时开发互不干扰
- **UI 自动化测试** — 内置 Playwright E2E 测试方案，适配桌面应用架构

## Quick Start

```bash
npx @dyyz1993/create-agent create my-project --type agent
cd my-project
bun install
bun run dev:web
```

## Template Types

| Type | Description | Use Case |
|------|-------------|----------|
| `general` | 完整模板，包含所有模块 | 通用桌面应用开发 |
| `chat` | 聊天对话型模板 | AI Chatbot、对话式交互应用 |
| `agent` | 编码 Agent 模板 | AI Coding Agent、自动化工具 |

```bash
create-agent list                          # 查看所有模板
create-agent create my-agent --type agent  # 指定模板创建项目
```

## Architecture

```
Electrobun (Desktop Shell)
  ├── Main Process (Bun)     ← RPC Server, 业务逻辑, 系统 API
  ├── Renderer (React)       ← RPC Client, UI 组件, TailwindCSS
  └── RPC Layer              ← type-safe 通信, IPC / WebSocket / SSE Transport
```

### 模板前端架构（以 agent 为例）

```
App.tsx
  ├── AppLayout              ← 布局容器（ExplorerSidebar + CenterPanel + RightPanel）
  ├── useRpcInit()           ← RPC 连接初始化 + 事件订阅
  └── useSidebarResize()     ← 侧边栏拖拽调整宽度

Stores（Zustand，无 Props Drilling）:
  ├── use-connection-store   ← 连接状态、模式（web/desktop）、重试
  ├── use-log-store          ← 日志管理
  ├── use-app-store          ← 全局 UI 状态
  ├── use-chat-store         ← 聊天消息
  ├── use-explorer-store     ← 文件浏览器
  ├── use-bash-store         ← 终端
  └── ...                    ← git, todo, rules, feed, sidebar, notification
```

ExplorerSidebar 等组件直接通过 store 获取数据，不经过 Props 传递。

### RPC 模块化架构

```
shared/
  ├── modules/       ← 类型定义（每个模块一个文件）
  │     ├── file.ts      interface FileMethods { ... }
  │     ├── chat.ts      interface ChatMethods, ChatEvents
  │     └── ...
  ├── handlers/      ← 实现（注册 RPC method + event）
  │     ├── file.ts      export function register(server, options)
  │     └── ...
  ├── rpc-schema.ts  ← 合并所有模块类型（前后端共享）
  └── register-all-handlers.ts  ← 自动发现并注册所有 handlers
```

技术栈：

- **Runtime**: Electrobun + Bun
- **Frontend**: React + TailwindCSS + Vite
- **Communication**: `@dyyz1993/rpc-core` (IPC / WebSocket / SSE / Stdio / In-Memory)
- **CLI**: `@dyyz1993/create-agent`

## RPC Framework

### Transport 层

所有传输层继承 `BaseTransport` 抽象类，统一 `onMessage` / `onError` / `onDisconnect` / `isConnected` 接口：

```ts
import { WebSocketTransport } from '@dyyz1993/rpc-core';

const transport = new WebSocketTransport({
  url: 'ws://localhost:3100/ws',
  reconnect: true,
  heartbeatInterval: 30000,
});
await transport.connect();
```

支持的传输层：`IPCTransport`、`WebSocketTransport`、`SSETransport`、`StdioTransport`、`InMemoryTransport`。

### 连接可靠性

**WebSocket 心跳 + 指数退避重连：**

- 可配置 `heartbeatInterval`（默认 30s）+ `heartbeatTimeout`
- 断线后自动重连，指数退避（`reconnectInterval * 2^attempt`，上限 `maxReconnectInterval`）
- 最多重试 `maxReconnectAttempts`（默认 10 次）

**SSE 自动重连 + 订阅恢复：**

- SSE Transport 内置断线检测 + 自动重连
- 重连成功后自动恢复活跃订阅

### subscribe 统一参数顺序

```ts
// subscribe(event, handler, filter?)
const subId = await client.subscribe(
  'chat.message',
  (payload) => console.log(payload),
  { roomId: 'general' }  // 可选 filter
);
client.unsubscribe(subId);
```

### 定义 RPC 模块

```ts
// 1. modules/file.ts — 类型定义
export interface FileMethods {
  'file.listDir': { params: { path: string }; result: { entries: Entry[] } };
}

// 2. handlers/file.ts — 实现
export function register(server: RPCServer, options: HandlerOptions): void {
  server.on('file.listDir', async ({ path }) => {
    return { entries: await readDir(path) };
  });
}

// 3. rpc-schema.ts — 合并类型
export interface RPCMethods extends AnyMethods, FileMethods, /* ... */ {}
```

新增模块只需：添加 module 类型 → 添加 handler → 在 `rpc-schema.ts` 的 extends 链追加。handlers 自动发现，无需修改注册入口。

## Security

| Feature | Description |
|---------|-------------|
| **路径校验** | `path-security.ts` 验证文件操作路径必须在 `allowedRoots` 内，阻止 `..` 穿越 + null byte 注入 |
| **命令限制** | `bash-security.ts` 通过 `blockedPatterns`（正则黑名单）+ `allowedCommands`（白名单）双重过滤 |
| **CORS 配置** | `CORS_ORIGIN` 环境变量控制允许的来源（默认 `http://localhost:5173`） |
| **Token 认证** | WebSocket 连接需携带 `token` 参数，生产环境未设置 `AUTH_TOKEN` 时打印警告 |
| **Token 来源** | URL query `?token=` → localStorage `rpc-auth-token` → 默认开发值 |

```ts
// 路径校验示例
import { validatePath } from './shared/lib/path-security';
const safePath = validatePath(userInput); // 抛出异常如果路径不合法

// 命令限制示例
import { validateCommand } from './shared/lib/bash-security';
const safeCmd = validateCommand(userCommand); // 抛出异常如果命令被禁止
```

## Parallel Development

`create-agent workspace add` 为每个功能创建独立工作区，配合不同端口实现多实例并行开发。

```bash
create-agent workspace add feature-A
create-agent workspace add feature-B

PORT=3101 VITE_PORT=5174 bun run dev:web  # Worker A
PORT=3102 VITE_PORT=5175 bun run dev:web  # Worker B

create-agent status  # 查看活跃实例
```

## Development Guide

### 运行测试

```bash
# rpc-core 单元测试
cd packages/rpc-core && bun test tests/

# 模板测试（Vitest）
cd templates/agent && npx vitest run
```

### 添加新 RPC 模块

1. **定义类型** — `src/shared/modules/<name>.ts`

```ts
export interface TodoMethods {
  'todo.list': { params: {}; result: { items: Todo[] } };
  'todo.add': { params: { title: string }; result: { id: string } };
}
export interface TodoEvents {
  'todo.changed': { items: Todo[] };
}
```

2. **实现 handler** — `src/shared/handlers/<name>.ts`

```ts
import type { RPCServer } from '@dyyz1993/rpc-core';
import type { HandlerOptions } from '../rpc-schema';

export function register(server: RPCServer, options: HandlerOptions): void {
  server.on('todo.list', async () => ({ items: [] }));
  server.on('todo.add', async ({ title }) => ({ id: crypto.randomUUID() }));
}
```

3. **注册** — 在 `rpc-schema.ts` 追加类型，在 `handlers/index.ts` 追加 export

### 模板架构说明

每个模板是独立项目（`templates/agent`、`templates/chat`、`templates/general`），包含：

- `src/bun/` — Electron 主进程入口
- `src/mainview/` — React 前端（stores、hooks、components、lib）
- `src/shared/` — 前后端共享（modules 类型、handlers 实现、lib 工具）
- `src/gateway/` — HTTP 路由 + WebSocket/SSE handler

## CI/CD

双平台持续集成，全流程测试：

| Stage | GitHub Actions | GitLab CI |
|-------|---------------|-----------|
| Lint | `lint` job | `lint` stage |
| Type Check | `type-check` job | `type-check` stage |
| RPC Test | `test` job | `test-rpc` stage |
| Template Test | `template-test` job | `test-templates` stage |
| Build Verify | `build-verify` (matrix) | `build-verify-*` (per template) |
| Integration | `integration-test` (matrix) | `integration-test-*` (per template) |
| E2E UI | `e2e-ui` (Playwright) | `e2e-ui-*` (Playwright) |

**通知：**
- **Bark** — CI 结果推送到 iOS（Bark API）
- **飞书** — 通过 `dyyz1993/ci-tools` reusable workflow 发送飞书群通知

## Packages

| Package | Description |
|---------|-------------|
| [`@dyyz1993/create-agent`](https://www.npmjs.com/package/@dyyz1993/create-agent) | 项目脚手架 CLI — create, list, status, workspace |
| [`@dyyz1993/rpc-core`](https://www.npmjs.com/package/@dyyz1993/rpc-core) | Type-safe RPC 通信框架 |

## CLI Commands

```
create-agent create <name>            创建新项目
create-agent list                     查看可用模板
create-agent status                   查看活跃的 pi-agent 实例
create-agent workspace add <name>     创建并行开发工作区
```

## License

[MIT](LICENSE)
