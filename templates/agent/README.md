# Pi Agent Template

Coding agent template built with Electrobun, React, Tailwind CSS, and RPC architecture. Extends the general template with **Bash**, **Rules**, and **Todo** management.

## Getting Started

```bash
bun install

# Development with HMR (recommended)
bun run dev:web

# Development without HMR
bun run dev

# Build
bun run build
```

## Features

All features from the **general** template, plus:

- **Bash Panel** — Execute shell commands, manage multiple processes, view output in a terminal-like interface
- **Rules Engine** — Define glob-pattern rules with enable/disable toggles for customizing agent behavior
- **Todo Manager** — Track tasks with pending/in_progress/completed status cycling

## RPC Modules

| Module | Methods | Events | Description |
|---|---|---|---|
| `system` | ping, hello, echo | - | Connectivity test |
| `file` | listDir, readFile, createFile, createDir, rename, delete, copy, findProjectRoot | - | File system operations |
| `timer` | start, stop | timer.tick | Timer + real-time push |
| `chat` | list, send | chat.message | Chat (supports role filtering) |
| `git` | status, diff, log, branches, checkout, add, reset, commit, push, pull | - | Git version control |
| `feed` | post, list | feed.update | Feed stream (supports category filtering) |
| `bash` | execute, kill, listProcesses | bash.output, bash.exit | Shell command execution |
| `rules` | list, add, toggle, remove | - | Rule management |
| `todo` | list, add, update, remove | - | Task tracking |

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
│   │   │   ├── bash.ts       # Bash RPC types
│   │   │   ├── rules.ts      # Rules RPC types
│   │   │   └── todo.ts       # Todo RPC types
│   │   └── handlers/         # RPC handler implementations
│   │       ├── bash.ts       # Bash handler (Bun.spawn)
│   │       ├── rules.ts      # Rules CRUD handler
│   │       └── todo.ts       # Todo CRUD handler
│   └── mainview/             # React frontend
│       ├── App.tsx           # Main app with Bash/Rules/Todo tabs
│       ├── components/
│       │   ├── activity-bar/ # Sidebar + mobile tabs (includes Rules)
│       │   ├── bash/         # BashPanel — terminal interface
│       │   ├── rules/        # RulesPanel — rule management
│       │   ├── todo/         # TodoPanel — task management
│       │   ├── chat/
│       │   ├── explorer/
│       │   ├── feed/
│       │   ├── git/
│       │   ├── search/
│       │   └── debug/
│       ├── stores/
│       │   ├── use-bash-store.ts   # Bash process state
│       │   ├── use-rules-store.ts  # Rules state
│       │   └── use-todo-store.ts   # Todo state
│       └── lib/
│           └── api-client.ts       # Typed RPC client
├── eslint-plugin-rpc/
├── electrobun.config.ts
├── vite.config.ts
└── tailwind.config.js
```
