# Pi Chat App

Chat-focused application template built with Electrobun, React, Tailwind CSS, and RPC architecture.

This is a minimal template derived from the `general` template with file management, git, feed, search, debug, and diff features removed — focused purely on chat messaging.

## Getting Started

```bash
bun install

# Web development with HMR
bun run dev:web

# Desktop development
bun run dev
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
│   │   ├── modules/          # RPC method type definitions (system + chat)
│   │   └── handlers/         # RPC handler implementations (system + chat)
│   └── mainview/             # React frontend
│       ├── App.tsx
│       ├── components/
│       │   ├── activity-bar/
│       │   ├── chat/
│       │   ├── sidebar/
│       │   └── titlebar/
│       ├── stores/            # Zustand state management
│       └── lib/
│           └── api-client.ts  # Typed RPC client (auto-detects transport)
├── eslint-plugin-rpc/        # Custom ESLint rules for RPC conventions
├── electrobun.config.ts
├── vite.config.ts
└── tailwind.config.js
```

## RPC Modules

| Module | Methods | Events | Description |
|---|---|---|---|
| `system` | ping, hello, echo | - | Connectivity test |
| `chat` | list, send | chat.message | Chat messaging (with role filtering) |
