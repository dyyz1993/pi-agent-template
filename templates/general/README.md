# Pi Agent App

Desktop + Web application template built with Electrobun, React, Tailwind CSS, and RPC architecture.

## Getting Started

```bash
bun install

# Development with HMR (recommended)
bun run dev:hmr

# Development without HMR
bun run dev

# Build
bun run build
```

## Transport 选型

本项目基于 `@dyyz1993/rpc-core`，提供 4 种 Transport 适配不同场景：

| Transport | 场景 | 通信方式 |
|---|---|---|
| `WebSocketTransport` | Web 端 | TCP → WebSocket 长连接 |
| `IPCTransport` | Electrobun 桌面端 | macOS Mach Port 原生桥接 |
| `InMemoryTransport` | 同进程（TUI / 测试） | 进程内函数直接调用 |
| `StdioTransport` | 父子进程（CLI / TUI） | NDJSON over stdin/stdout |

### 使用示例

```typescript
// Web 端
import { WebSocketTransport } from "@dyyz1993/rpc-core";
const transport = new WebSocketTransport("ws://localhost:3100/ws?token=xxx");
await transport.connect();

// 桌面端 (Electrobun)
import { IPCTransport } from "@dyyz1993/rpc-core";
const transport = new IPCTransport();

// 同进程 TUI / 测试
import { InMemoryTransport } from "@dyyz1993/rpc-core";
const { client, server } = InMemoryTransport.createPair();

// 父子进程 CLI
import { StdioTransport } from "@dyyz1993/rpc-core";
const transport = new StdioTransport(); // 默认 process.stdin / process.stdout
await transport.connect();
```

### 父子进程 STDIO 对接

```typescript
// 父进程：启动 TUI 子进程
import { spawn } from "child_process";
import { StdioTransport } from "@dyyz1993/rpc-core";

const child = spawn("bun", ["tui.ts"], { stdio: ["pipe", "pipe", "inherit"] });
const transport = new StdioTransport({
  stdin: child.stdout,
  stdout: child.stdin,
});
await transport.connect();
```

## Project Structure

```
├── src/
│   ├── bun/
│   │   └── index.ts          # Desktop entry (Electrobun main process)
│   ├── server.ts             # Web entry (HTTP + WebSocket server)
│   ├── gateway/
│   │   ├── http-routes.ts    # HTTP endpoints
│   │   ├── ws-handler.ts     # WebSocket RPC server
│   │   └── ipc-transport.ts  # Electrobun IPC bridge
│   ├── shared/
│   │   ├── rpc-schema.ts     # Unified RPC type definitions
│   │   ├── register-all-handlers.ts
│   │   ├── modules/          # RPC method type definitions
│   │   └── handlers/         # RPC handler implementations
│   └── mainview/             # React frontend
│       ├── App.tsx
│       ├── components/
│       │   ├── activity-bar/
│       │   ├── chat/
│       │   ├── explorer/
│       │   ├── feed/
│       │   ├── file-preview/
│       │   ├── git/
│       │   ├── search/       # File search across project
│       │   └── debug/
│       ├── stores/            # Zustand state management
│       └── lib/
│           └── api-client.ts  # Typed RPC client (auto-detects transport)
├── eslint-plugin-rpc/        # Custom ESLint rules for RPC conventions
├── electrobun.config.ts
├── vite.config.ts
└── tailwind.config.js
```

## RPC 模块列表

| 模块 | 方法 | 事件 | 说明 |
|---|---|---|---|
| `system` | ping, hello, echo | - | 连通性测试 |
| `file` | listDir, readFile, createFile, createDir, rename, delete, copy, findProjectRoot | - | 文件系统操作 |
| `timer` | start, stop | timer.tick | 定时器 + 实时推送 |
| `chat` | list, send | chat.message | 聊天（支持按 role 过滤） |
| `git` | status, diff, log, branches, checkout, add, reset, commit, push, pull | - | Git 版本控制 |
| `feed` | post, list | feed.update | Feed 流（支持 category 过滤） |
