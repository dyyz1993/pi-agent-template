---
alwaysApply: true
description: 当用户要求记忆、记住某些内容，或AI认为重要信息需要持久化时，自动将内容写入本项目的记忆文件中
---

# 项目记忆文件

本文件用于存储项目相关的持久化记忆，确保 AI 在不同会话中保持上下文一致性。

## 更新规则

当用户触发以下场景时，必须自动更新本文件：
- 用户明确说"记住"、"记忆"
- 用户提供了重要的项目信息、偏好或配置
- AI 判断需要持久化的关键上下文

## 记忆内容格式

```markdown
## YYYY-MM-DD 记忆标题

- 记忆内容点1
- 记忆内容点2
```

## 2026-04-22 Sandbox 配置记忆

- Trae sandbox.json 位于 `~/.trae-cn/sandbox.json`
- 读写权限配置：`filesystem.readWrite: ["/Users/xuyingzhou/.trae-cn/", "/Users/xuyingzhou/Project/"]`
- 项目目录：`/Users/xuyingzhou/Project/`，排除了 `.trae`、`.vscode`、`.git`

## 历史记忆

## 2026-04-22 项目结构说明

### 项目定位
- 这是一个**仓库模板**，也是**多包（monorepo）**
- 模板用途：用户通过 `bun run create <project-name>` 创建新项目

### 目录结构
```
pi-agent-template/                          ← 项目根目录（monorepo 根）
├── scripts/create.ts                      ← 项目创建脚本
├── packages/rpc-core/                    ← 通用 RPC 底层能力（抽象，可复用）
│   └── src/
│       ├── core/                         ← 核心：Transport、Types、Utils
│       ├── middleware/                   ← 中间件：Auth 等
│       ├── transports/                   ← 传输层实现
│       └── tests/                        ← 单元测试
├── template/                             ← 应用模板（create.ts 复制此目录）
│   ├── src/
│   │   ├── bun/                         ← 桌面端入口
│   │   ├── mainview/                    ← 前端 UI（Solid.js）
│   │   └── server.ts                    ← Web 端入口
│   ├── packages/rpc-core/               ← 链接到 packages/rpc-core
│   └── ...
├── .trae/rules/                         ← AI 规则目录
└── .husky/                              ← Git hooks
```

### 创建项目命令
```bash
bun run create <project-name> [target-dir]
```

### RPC 能力来源
- `packages/rpc-core/` 中的 RPC 底层能力，来自项目 `/Users/xuyingzhou/Project/study-desktop/my-react-tailwind-vite-app2` 的沉淀和经验
- 这些是通用的、抽象的 RPC 基础设施，可在多个项目间复用

### 当不清楚时
遇到项目结构、多包关系、文件归属等问题时：
1. 先查看本文件（.trae/rules/memory.md）
2. 查看目录结构确认文件位置
3. 确认是"底层包（packages/rpc-core）"还是"模板（template/）"

## 2026-04-22 传输层架构与鉴权策略

### 双端自动切换
BrowserTransport 自动检测运行环境：
- 检测到 `window.__electrobunBunBridge` → **IPC 模式（桌面端）**
- 未检测到 → **WebSocket 模式（浏览器端）**

### 鉴权策略
| 端 | 传输方式 | 鉴权 |
|----|---------|------|
| **桌面端** | IPC | ❌ 不需要鉴权 |
| **Web 端** | WebSocket | ✅ 需要 token 验证 |

### 实现细节
- **桌面端**: `ElectrobunTransport.handleMessage()` 收到 IPC 消息时，自动注入 `{ source: 'local', userId: 'local-user', role: 'admin' }` 上下文
- **Web 端**: `AuthMiddleware` 验证请求中的 token，拒绝无上下文请求
- 桌面端使用 `LocalAuthMiddleware`，Web 端使用 `AuthMiddleware`

### 关键文件
- `packages/rpc-core/src/transports/electrobun.ts` - IPC Transport
- `packages/rpc-core/src/transports/browser.ts` - Browser Transport（含 IPC/WebSocket 自动切换）
- `packages/rpc-core/src/transports/ws-server.ts` - WebSocket 服务端
- `packages/rpc-core/src/middleware/auth.ts` - 鉴权中间件
