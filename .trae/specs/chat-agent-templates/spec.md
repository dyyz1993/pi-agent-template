# Chat & Agent 模板实现 Spec

## Why
当前 `templates/chat/` 和 `templates/agent/` 仅有 README 占位文件，需要基于 `general` 模板分别做减法和加法，生成可用的独立模板。

## Source of Truth
- **基础模板**: `templates/general/`（已完成，已通过 3 实例并发隔离测试）
- **参考实现**: `/Users/xuyingzhou/Project/temporary/pi-agent-chat/`（生产级 chat app）

---

## A. Chat 模板（general 做减法）

### 定位
纯聊天应用模板，去掉文件管理/版本控制等功能，专注消息交互。

### 保留（从 general 复制）
```
server.ts, server-config.ts, gateway/, shared/lib/, shared/handlers/system.ts,
shared/modules/system.ts, shared/modules/chat.ts,
mainview/lib/api-client.ts, mainview/hooks/use-breakpoint.ts,
mainview/hooks/use-input-history.ts, mainview/stores/message-batcher.ts,
mainview/stores/use-notification-store.ts, mainview/stores/use-sidebar-store.ts,
mainview/stores/use-chat-store.ts, mainview/stores/use-app-store.ts,
mainview/components/chat/ChatPanel.tsx, mainview/components/chat/MessageBubble.tsx,
mainview/components/sidebar/PinButton.tsx,
mainview/types/index.ts, mainview/utils/constants.ts,
scripts/dev.ts, vite.config.ts, tsconfig.json, tailwind.config.js, postcss.config.js,
eslint.config.mjs, eslint-plugin-rpc/, package.json, .env.example, .gitignore
```

### 删除（相对 general）
| 文件/目录 | 原因 |
|-----------|------|
| `components/explorer/*` | 无文件管理 |
| `components/git/*` | 无版本控制 |
| `components/feed/*` | 无 Feed 流 |
| `components/search/*` | 无全局搜索 |
| `components/debug/*` | 无调试面板 |
| `components/diff/*` | 无 Diff 查看 |
| `components/file-preview/*` | 无文件预览 |
| `stores/use-explorer-store.ts` | 对应组件已删 |
| `stores/use-git-store.ts` | 对应组件已删 |
| `stores/use-feed-store.ts` | 对应组件已删 |
| `handlers/file.ts, handlers/git.ts, handlers/feed.ts, handlers/timer.ts` | 不需要 |
| `modules/file.ts, modules/git.ts, modules/feed.ts, modules/timer.ts` | 不需要 |
| `utils/drop-handler.ts, utils/file-icon.tsx, utils/file-utils.ts` | 文件相关工具 |

### 修改（相对 general）
| 文件 | 改动 |
|------|------|
| `App.tsx` | 主区域只渲染 ChatPanel，无 Explorer/Git/Feed/Search/Debug tab |
| `ActivityBar.tsx` | 只保留 Chat 图标（1 个按钮） |
| `MobileTabBar.tsx` | 只保留 Chat tab |
| `rpc-schema.ts` | 只保留 SystemMethods + ChatMethods + ChatEvents |
| `register-all-handlers.ts` | 只注册 system + chat |
| `handlers/index.ts` | 只导出 system + chat |
| `use-app-store.ts` | 精简 tab 定义，只保留 chat |
| `package.json` | name 改为 chat 相关，去掉不需要的依赖（react-diff-viewer-continued 等） |

---

## B. Agent 模板（general 做加法）

### 定位
编码助手模板，保留 general 全部功能，额外增加 Bash 进程管理、Rules 引擎、Todo 管理。

### 基础（从 general 全部复制）

### 新增文件
| 文件 | 说明 |
|------|------|
| `components/bash/BashPanel.tsx` | Bash 进程面板：终端输入/输出，支持多进程 |
| `components/rules/RulesPanel.tsx` | Rules 引擎面板：显示/编辑规则列表 |
| `components/todo/TodoPanel.tsx` | Todo 管理面板：任务列表，状态切换 |
| `stores/use-bash-store.ts` | Bash 进程状态（进程列表、输出缓冲、活跃进程 PID） |
| `stores/use-rules-store.ts` | Rules 状态（规则列表、启用/禁用） |
| `stores/use-todo-store.ts` | Todo 状态（任务列表、增删改查、状态） |
| `shared/handlers/bash.ts` | Bash RPC handler（execute、kill、listProcesses） |
| `shared/handlers/rules.ts` | Rules RPC handler（list、add、toggle、remove） |
| `shared/handlers/todo.ts` | Todo RPC handler（list、add、update、remove） |
| `shared/modules/bash.ts` | Bash RPC 类型定义 |
| `shared/modules/rules.ts` | Rules RPC 类型定义 |
| `shared/modules/todo.ts` | Todo RPC 类型定义 |

### 修改文件（相对 general）
| 文件 | 改动 |
|------|------|
| `App.tsx` | ActivityBar 加入 Bash/Rules/Todo 图标，主区域加入对应面板 |
| `ActivityBar.tsx` | 新增 Bash、Rules、Todo 图标按钮 |
| `MobileTabBar.tsx` | 新增对应 tab |
| `rpc-schema.ts` | 新增 BashMethods + RulesMethods + TodoMethods |
| `register-all-handlers.ts` | 新增 bash + rules + todo handler 注册 |
| `handlers/index.ts` | 新增 bash + rules + todo 导出 |
| `use-app-store.ts` | Tab 定义加入 bash/rules/todo |
| `use-sidebar-store.ts` | SidebarPanelId 加入 'rules' |

---

## C. 共用构建脚本

pi-cli 目前只支持 `general` 模板。需要更新：
- `packages/pi-cli/src/lib/templates.ts` — 加入 `chat` 和 `agent` 到可用模板列表
- `packages/pi-cli/src/cli.ts` — `create` 命令支持 `--template chat|agent` 参数

---

## 验收标准

每个模板必须通过：
1. `pi create <name> --template <type>` 成功创建项目
2. `bun run dev:web` 启动无报错
3. 浏览器打开无白屏、无 console error
4. 各自的核心功能可用（chat: 发消息+bot回复; agent: bash/rules/todo 面板可交互）
5. 3 实例并发隔离测试通过
