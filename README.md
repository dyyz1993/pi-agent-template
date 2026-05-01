# Pi Agent Template — AI Agent 桌面应用脚手架

[![npm version](https://img.shields.io/npm/v/@dyyz1993/pi-cli.svg)](https://www.npmjs.com/package/@dyyz1993/pi-cli)
[![license](https://img.shields.io/npm/l/@dyyz1993/pi-cli.svg)](https://github.com/dyyz1993/pi-agent-template/blob/main/LICENSE)

Pi Agent Template 是一套用于构建 AI Agent 桌面应用的工程化脚手架。基于 Electrobun + React + Vite + Bun，内置 type-safe RPC 通信框架，支持并行开发工作流和 UI 自动化测试。

## Features

- **3 种模板类型** — general (全功能)、chat (对话型)、agent (编码 Agent)
- **Type-safe RPC 框架** — `@dyyz1993/rpc-core`，支持 request-response、pub-sub、streaming，自带 IPC / WebSocket / Stdio / In-Memory 传输层
- **并行开发工作流** — `pi workspace add` 创建隔离工作区，多实例同时开发互不干扰
- **UI 自动化测试** — 内置 Playwright E2E 测试方案，适配桌面应用架构

## Quick Start

```bash
npx @dyyz1993/pi-cli create my-project --type agent
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
# 查看所有模板
pi list

# 指定模板创建项目
pi create my-agent --type agent
```

## Architecture

```
Electrobun (Desktop Shell)
  ├── Main Process (Bun)     ← RPC Server, 业务逻辑, 系统 API
  ├── Renderer (React)       ← RPC Client, UI 组件, TailwindCSS
  └── RPC Layer              ← type-safe 通信, IPC Transport
```

技术栈：

- **Runtime**: Electrobun + Bun
- **Frontend**: React + TailwindCSS + Vite
- **Communication**: `@dyyz1993/rpc-core` (IPC / WebSocket / Stdio / In-Memory)
- **CLI**: `@dyyz1993/pi-cli`

## Parallel Development

`pi workspace add` 为每个功能创建独立工作区，配合不同端口实现多实例并行开发。

```bash
# 创建工作区
pi workspace add feature-A
pi workspace add feature-B

# 分别启动不同实例
PORT=3101 VITE_PORT=5174 bun run dev:web  # Worker A
PORT=3102 VITE_PORT=5175 bun run dev:web  # Worker B
```

查看活跃实例：

```bash
pi status
```

## Adding RPC Modules

RPC 模块通过 `defineModule` 定义，自动获得完整类型推导：

```ts
import { defineModule, defineRPC } from '@dyyz1993/rpc-core';

const fileModule = defineModule('file', {
  read: defineRPC<{ path: string }, { content: string }>(),
  write: defineRPC<{ path: string; content: string }, void>(),
});

const definition = defineRPC({
  file: fileModule,
});
```

Server 端注册 handler：

```ts
import { createTypedServer } from '@dyyz1993/rpc-core';

const server = createTypedServer(definition, {
  file: {
    read: async ({ path }) => ({ content: await readFile(path) }),
    write: async ({ path, content }) => { await writeFile(path, content); },
  },
});
```

Client 端获得完整类型提示：

```ts
import { createTypedClient } from '@dyyz1993/rpc-core';

const client = createTypedClient(definition, transport);
const result = await client.file.read({ path: '/tmp/test.txt' });
// result.content — fully typed
```

支持的传输层：`IPCTransport`、`WebSocketTransport`、`StdioTransport`、`InMemoryTransport`。

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [`@dyyz1993/pi-cli`](https://www.npmjs.com/package/@dyyz1993/pi-cli) | [![npm](https://img.shields.io/npm/v/@dyyz1993/pi-cli.svg)](https://www.npmjs.com/package/@dyyz1993/pi-cli) | 项目脚手架 CLI — create, list, status, workspace |
| [`@dyyz1993/rpc-core`](https://www.npmjs.com/package/@dyyz1993/rpc-core) | [![npm](https://img.shields.io/npm/v/@dyyz1993/rpc-core.svg)](https://www.npmjs.com/package/@dyyz1993/rpc-core) | Type-safe RPC 通信框架 |

## CLI Commands

```
pi create <name>            创建新项目
pi list                     查看可用模板
pi status                   查看活跃的 pi-agent 实例
pi workspace add <name>     创建并行开发工作区
```

## License

[MIT](LICENSE)
