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
├── packages/rpc-core/                    ← 通用 RPC 底层能力（npm 包 @dyyz1993/rpc-core）
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
│   └── package.json                     ← 依赖 @dyyz1993/rpc-core
├── .trae/rules/                         ← AI 规则目录
└── .husky/                              ← Git hooks
```

### 多包管理
- 使用 pnpm workspaces（`pnpm-workspace.yaml`）
- `packages/rpc-core/` 和 `template/` 都通过 pnpm 管理

### RPC 包
- 包名：`@dyyz1993/rpc-core`
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

## 2026-04-23 核心诉求（最高优先级）

### RPC 底层包原则
- **直接使用原始项目** `/Users/xuyingzhou/Project/study-desktop/my-react-tailwind-vite-app2` 的 `packages/@ai-chat/rpc-core`
- 原始项目的 RPC 包已被验证完美，不要重新设计，直接拿过来用
- 底层包的核心职责：**抹平 Web 与桌面端的差异**，统一 RPC 调用

### 三大核心诉求

#### 1. RPC 通信（核心中的核心）
- 支持 RPC 方法调用（call）
- 支持事件订阅（subscribe）和取消订阅（unsubscribe）
- 底层自动识别 IPC（桌面）还是 WebSocket（Web），对上层透明
- 前端显示当前连接协议（IPC / WebSocket）

#### 2. 网关与鉴权
- **桌面端**：IPC 模式，**无需鉴权**（本机程序，天然安全）
- **Web 端**：WebSocket 模式，**需要 Token 鉴权**（部署到 Linux 服务器，外部可访问）
- Web 端 Token 先用**写死**的方式，简单实现
- 桌面端和 Web 端可以**同时启动**，也可以**单独启动**

#### 3. 文件系统
- **桌面端**：直接使用本地路径（绝对路径 / `file://` 协议），无需 HTTP 服务
- **Web 端**：必须通过 HTTP 服务访问文件（部署在远程服务器）
- Web 端的 HTTP 文件服务也需要 Token 鉴权（参数或 Header 中携带）
- 原因：WebSocket 传输图片/大文件效果不佳，必须走 HTTP

### 端差异总览
| | 桌面端 | Web 端 |
|--|-------|--------|
| RPC 传输 | IPC（Electrobun） | WebSocket |
| 鉴权 | 不需要 | Token（写死） |
| 文件访问 | 本地路径直接访问 | HTTP 服务 + Token |
| 运行环境 | 本地电脑 | Linux 服务器 |

### 模板必须包含的内容
1. 文件树结构展示
2. PC 端 RPC 调用演示（call / subscribe / unsubscribe）
3. 桌面端与 Web 端的连通性验证
4. UI 显示当前底层协议（IPC / WebSocket）
5. 未来预留：内存传输模式（给 Tauri 用）

## 2026-04-22 日志规范

### ESLint 规则
- `console.log` 是 error 级别
- `console.warn` 和 `console.error` 允许
- 详见 `.trae/rules/logging.md`

### 日志工具
- 推荐使用 **pino**（高性能 JSON 日志）
- 同时输出到终端和文件
- 详细指南见 `.trae/rules/logging.md`
