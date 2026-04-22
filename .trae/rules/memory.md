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
- **核心目标**：快速创建兼容桌面与 Web 的应用模板

### 目录结构
```
pi-agent-template/                          ← 项目根目录（monorepo 根）
├── scripts/create.ts                      ← 项目创建脚本
├── packages/rpc-core/                    ← 通用 RPC 底层能力（npm 包 @chat-agent/rpc-core）
│   └── src/
│       ├── core/                         ← 核心：Transport、Types、Utils
│       ├── middleware/                   ← 中间件：Auth 等
│       ├── transports/                   ← 传输层实现
│       └── tests/                        ← 单元测试
├── template/                             ← 应用模板（create.ts 复制此目录）
│   ├── src/
│   │   ├── bun/                         ← 桌面端入口
│   │   ├── mainview/                    ← 前端 UI（React）
│   │   ├── server.ts                    ← Web 端入口
│   │   └── gateway.ts                   ← Gateway 统一入口
│   ├── .trae/rules/                     ← AI 规则（会复制到新项目）
│   └── package.json                     ← 依赖 @chat-agent/rpc-core
├── .trae/rules/                         ← AI 规则目录
└── .husky/                              ← Git hooks
```

### 多包管理
- 使用 pnpm workspaces（`pnpm-workspace.yaml`）
- `packages/rpc-core/` 和 `template/` 都通过 pnpm 管理

### RPC 包
- 包名：`@chat-agent/rpc-core`
- 通过 npm 发布，用户创建项目后 `bun install` 自动拉取
- `packages/rpc-core/` 在根目录维护，模板通过 npm 引用

### 创建项目命令
```bash
bun run create <project-name> [target-dir]
```

### RPC 能力来源
- `packages/rpc-core/` 中的 RPC 底层能力，来自项目 `/Users/xuyingzhou/Project/study-desktop/my-react-tailwind-vite-app2` 的沉淀和经验
- 这些是通用的、抽象的 RPC 基础设施，可在多个项目间复用

### 原始项目参考
- **原始项目**：`/Users/xuyingzhou/Project/study-desktop/my-react-tailwind-vite-app2`
- **用途**：当前模板由原始项目演变而来
- **用法**：当不清楚某些功能如何实现时，可参考原始项目代码
- **方式**：使用 Task 工具的 search 子任务搜索相关代码并复制

### 当不清楚时
遇到项目结构、多包关系、文件归属等问题时：
1. 先查看本文件（.trae/rules/memory.md）
2. 查看目录结构确认文件位置
3. 确认是"底层包（packages/rpc-core）"还是"模板（template/）"

## 2026-04-22 架构设计（核心需求）

### 多端支持
| 端 | 传输方式 | 特点 |
|----|---------|------|
| **桌面端** | IPC | 自动选择，无需鉴权 |
| **Web 端** | WebSocket | 需要鉴权 |
| **TUI 端** | 内存 | 本地直接调用 |

### 双端自动切换
BrowserTransport 自动检测运行环境：
- 检测到 `window.__electrobunBunBridge` → **IPC 模式（桌面端）**
- 未检测到 → **WebSocket 模式（浏览器端）**

### 执行模式
- 支持分开执行（单独启动桌面端或 Web 端）
- 支持同时启动（多端并存）
- 数据保持同步（通过统一的 RPC 层）

## 2026-04-22 文件服务设计

### 问题背景
- WebSocket 传图片或文件效果不佳，需依赖文件服务
- 桌面端与 Web 端的服务层不一样

### 服务层差异
| 端 | 文件服务方式 |
|----|------------|
| **桌面端** | 基于绝对路径或 `file://` 协议 |
| **Web 端** | 基于 HTTP 服务 |

### 默认路径规则
- 服务默认在**当前启动的根目录**下展示
- 包括点击图片等操作，都通过这个服务获取
- WORKSPACE_ROOT = 项目启动目录

## 2026-04-22 鉴权策略

### 鉴权配置
| 端 | 传输方式 | 鉴权 |
|----|---------|------|
| **桌面端** | IPC | ❌ 不需要鉴权 |
| **Web 端** | WebSocket | ✅ 需要 token 验证 |

### 实现细节
- **桌面端**: `ElectrobunTransport.handleMessage()` 收到 IPC 消息时，自动注入 `{ source: 'local', userId: 'local-user', role: 'admin' }` 上下文
- **Web 端**: `AuthMiddleware` 验证请求中的 token，拒绝无上下文请求
- 桌面端使用 `LocalAuthMiddleware`，Web 端使用 `AuthMiddleware`
- **Gateway 统一鉴权**：`gateway.ts` 统一处理所有端的鉴权逻辑

### 关键文件
- `packages/rpc-core/src/transports/electrobun.ts` - IPC Transport
- `packages/rpc-core/src/transports/browser.ts` - Browser Transport（含 IPC/WebSocket 自动切换）
- `packages/rpc-core/src/transports/ws-server.ts` - WebSocket 服务端
- `packages/rpc-core/src/middleware/auth.ts` - 鉴权中间件

## 2026-04-22 日志规范

### ESLint 规则
- `console.log` 是 error 级别
- `console.warn` 和 `console.error` 允许
- 详见 `.trae/rules/logging.md`

### 日志工具
- 推荐使用 **pino**（高性能 JSON 日志）
- 同时输出到终端和文件
- 详细指南见 `.trae/rules/logging.md`
