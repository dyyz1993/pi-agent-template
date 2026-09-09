# Browser Agent Template

AI-powered browser automation agent. Built with Electrobun, React, Tailwind CSS, and RPC architecture.

Control a real Chrome browser via natural language — Agent executes xbrowser commands (goto, click, scrape, fill, screenshot, search...), streams progress in real-time with turn-by-turn tool call cards, and delivers collected data as structured files (CSV/JSON/MD).

70+ site-specific plugins (小红书, 豆瓣, B站, 淘宝) available.

## Getting Started

```bash
bun install

# Web mode (development with HMR) — Backend :5200, Vite :7200
bun run dev:web

# Desktop mode (Electrobun native app)
bun run dev

# Build
bun run build
```

## Key Features

- **Agent Chat** — Natural language → browser automation. Streaming turns, tool call cards, thinking blocks
- **xbrowser Engine** — Full command set: goto, click, fill, scrape, crawl, search, screenshot, eval, tabs, plugins
- **Plugin System** — 70+ site plugins, inline selector in the topbar
- **Skill System** — Pre-built skills (小红书 explore/search/blogger) in sidebar
- **Session Management** — Conversation history, message persistence, context memory
- **Assets Panel** — Screenshots, images, CSV/JSON/MD files grouped and downloadable
- **Three-Panel Layout** — Sidebar (skills + sessions) | Chat | Assets
- **Desktop + Web** — Dual mode via Electrobun (desktop) + Vite (web)

## RPC Modules

| Module | Methods | Events | Description |
|---|---|---|---|
| `browser` | agentChat, checkConnection, listTabs, listPlugins, execXbrowser, getSystemInfo | agentStart, toolCall, toolResult, thinking, textDelta, turn, done, progress | Browser auto + Agent AI loop |
| `session` | create, get, list, addMessage, updateLastMessage, setStatus | – | Session CRUD + message management |
| `system` | ping, hello, echo | – | Connectivity test |
| `file` | listDir, readFile, createFile, createDir, rename, delete, copy, findProjectRoot | – | File system operations |
| `timer` | start, stop | timer.tick | Timer + real-time push |
| `chat` | list, send | chat.message | Chat (role filtering) |
| `git` | status, diff, log, branches, checkout, add, reset, commit, push, pull | – | Git version control |
| `feed` | post, list | feed.update | Feed stream |

## Project Structure

```
├── src/
│   ├── bun/index.ts              # Desktop entry (Electrobun main process)
│   ├── server.ts                 # Web entry (HTTP + WebSocket server)
│   ├── server-config.ts          # Config (PORT=5200, VITE_PORT=7200)
│   ├── gateway/
│   │   ├── http-routes.ts        # HTTP endpoints + asset download
│   │   ├── ws-handler.ts         # WebSocket RPC (token auth)
│   │   └── ipc-transport.ts      # Electrobun IPC bridge
│   ├── shared/
│   │   ├── rpc-schema.ts         # Unified RPC type definitions
│   │   ├── register-all-handlers.ts
│   │   ├── modules/
│   │   │   ├── browser.ts        # Browser + Agent RPC types
│   │   │   └── session.ts        # Session CRUD types
│   │   ├── handlers/
│   │   │   ├── browser.ts        # Agent chat + xbrowser execution
│   │   │   └── session.ts        # In-memory SessionStore
│   │   └── lib/
│   │       ├── agent.ts          # RpcClient manager + agentChat()
│   │       ├── cdp.ts            # xbrowser CLI + scrapeXhs pipeline
│   │       ├── generate.ts       # CSV/JSON/MD/ZIP export
│   │       └── xhs-extract.ts    # 小红书 DOM extraction
│   └── mainview/
│       ├── App.tsx               # Entry + connection detection
│       ├── components/
│       │   ├── layout/           # AppLayout (sidebar|chat|assets)
│       │   ├── topbar/           # Logo, plugins, status, theme
│       │   ├── chat/             # ChatPanel + MessageBubble (streaming)
│       │   ├── sidebar/          # SkillSidebar + SessionSidebar
│       │   └── assets/           # AssetsPanel (files/images)
│       ├── stores/
│       │   ├── use-chat-store.ts         # Agent streaming state
│       │   ├── use-session-store.ts      # Session CRUD
│       │   ├── use-connection-store.ts   # Browser + plugins
│       │   └── use-asset-store.ts        # Assets management
│       └── lib/
│           └── api-client.ts     # Typed RPC client (WS + IPC)
├── AGENTS.md                     # Agent system prompt
├── electrobun.config.ts
├── vite.config.ts
└── tailwind.config.js
```

## Environment

| Variable | Default | Description |
|---|---|---|
| `PORT` | 5200 | Backend server port |
| `VITE_PORT` | 7200 | Vite dev server port |
| `AUTH_TOKEN` | (auto) | WebSocket auth token |
| `CDP_ENDPOINT` | http://localhost:9221 | cdp-tunnel address |
| `AGENT_MAX_TURNS` | 30 | Max agent turns per chat |
| `AGENT_TIMEOUT_MS` | 300000 | Agent timeout (5 min) |
