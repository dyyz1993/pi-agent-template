# RPC API Reference（精简版）

## Transport 层

| Transport | 用途 | 初始化 |
|-----------|------|--------|
| IPC | 桌面端（Electrobun） | `new IPCTransport()` |
| WebSocket | Web 端 | `new WebSocketTransport(url)` |
| InMemory | 测试 | `new InMemoryTransport()` |

## 方法列表

### System Module — 基础连通性

| 方法 | Params | Result |
|------|--------|--------|
| `system.ping` | `{}` | `{ pong: boolean, timestamp: number, platform: string }` |
| `system.hello` | `{ name?: string }` | `{ message: string, timestamp: number }` |
| `system.echo` | `unknown` | `unknown` |

### File Module — 文件系统

| 方法 | Params | Result |
|------|--------|--------|
| `file.findProjectRoot` | `{}` | `{ path: string }` |
| `file.listDir` | `{ path: string }` | `{ entries: DirEntry[], basePath: string }` |
| `file.readFile` | `{ path: string }` | `{ content: string, size: number }` |
| `file.createFile` | `{ dirPath: string, name: string }` | `{ path: string }` |
| `file.createDir` | `{ dirPath: string, name: string }` | `{ path: string }` |
| `file.rename` | `{ oldPath: string, newName: string }` | `{ newPath: string }` |
| `file.delete` | `{ path: string }` | `{ ok: boolean }` |
| `file.copy` | `{ srcPath: string, destDir: string }` | `{ path: string }` |

### Chat Module — 聊天

| 方法 | Params | Result |
|------|--------|--------|
| `chat.list` | `{ limit?: number, cursor?: string }` | `{ messages: ChatMessage[], hasMore: boolean }` |
| `chat.send` | `{ content: string }` | `{ ok: boolean }` |

事件：`chat.message` — `{ id, role, content, timestamp }`

### Bash Module — Shell 执行（仅 Agent/General）

| 方法 | Params | Result |
|------|--------|--------|
| `bash.execute` | `{ command: string, cwd?: string }` | `{ pid: number, output: string }` |
| `bash.kill` | `{ pid: number }` | `{ success: boolean }` |
| `bash.listProcesses` | `{}` | `{ processes: ProcessInfo[] }` |

事件：`bash.output` — `{ pid, data, stream }`，`bash.exit` — `{ pid, code }`

### Git Module — 版本控制

| 方法 | Params | Result |
|------|--------|--------|
| `git.status` | `{ repoPath: string }` | `{ staged, changed, untracked, branch, ahead, behind }` |
| `git.diff` | `{ repoPath, filePath, staged? }` | `{ filePath, diff, oldContent, newContent }` |
| `git.log` | `{ repoPath, maxCount? }` | `{ commits: CommitInfo[] }` |
| `git.commitFiles` | `{ repoPath, hash }` | `{ files: GitFileChange[] }` |
| `git.commitFileDiff` | `{ repoPath, hash, filePath }` | `{ filePath, diff, oldContent, newContent }` |
| `git.branches` | `{ repoPath }` | `{ branches: BranchInfo[] }` |
| `git.checkout` | `{ repoPath, branch }` | `{ ok: boolean }` |
| `git.add` | `{ repoPath, paths }` | `{ ok: boolean }` |
| `git.reset` | `{ repoPath, paths }` | `{ ok: boolean }` |
| `git.commit` | `{ repoPath, message }` | `{ hash, shortHash }` |
| `git.push` | `{ repoPath }` | `{ ok: boolean }` |
| `git.pull` | `{ repoPath }` | `{ ok: boolean }` |
| `git.worktreeList` | `{ repoPath }` | `{ worktrees: WorktreeInfo[] }` |

### Feed Module — 动态

| 方法 | Params | Result |
|------|--------|--------|
| `feed.post` | `{ content, category, author? }` | `{ id: string }` |
| `feed.list` | `{ category?, limit? }` | `{ posts: FeedPost[] }` |

事件：`feed.update` — `FeedPost`

### Timer Module — 定时器

| 方法 | Params | Result |
|------|--------|--------|
| `timer.start` | `{}` | `{ started?: boolean, alreadyRunning?: boolean }` |
| `timer.stop` | `{}` | `{ stopped: boolean }` |

事件：`timer.tick` — `{ count, timestamp }`

### Todo Module — 任务管理（仅 Agent）

| 方法 | Params | Result |
|------|--------|--------|
| `todo.list` | `{}` | `{ items: TodoItem[] }` |
| `todo.add` | `{ content }` | `{ item: TodoItem }` |
| `todo.update` | `{ id, status }` | `{ item: TodoItem }` |
| `todo.remove` | `{ id }` | `{ success: boolean }` |

### Rules Module — 规则管理（仅 Agent）

| 方法 | Params | Result |
|------|--------|--------|
| `rules.list` | `{}` | `{ rules: Rule[] }` |
| `rules.add` | `{ name, pattern }` | `{ rule: Rule }` |
| `rules.toggle` | `{ id }` | `{ rule: Rule }` |
| `rules.remove` | `{ id }` | `{ success: boolean }` |

## 共享类型

```typescript
type TodoStatus = "pending" | "in_progress" | "completed";
interface TodoItem { id: string; content: string; status: TodoStatus; createdAt: number; }

type FeedCategory = "tech" | "news" | "general";
interface FeedPost { id: string; content: string; category: FeedCategory; author: string; timestamp: number; }

interface GitFileChange { path: string; status: "modified" | "added" | "deleted" | "renamed" | "copied"; }

interface Rule { id: string; name: string; pattern: string; enabled: boolean; }
```

## 安全

- 文件操作受限路径（`path-security.ts`）
- Bash 命令黑名单校验（`bash-security.ts`）
- WebSocket 连接需要 token 认证
- Token 比较使用 `timingSafeEqual` 防时序攻击

## 错误处理

| 场景 | 响应 |
|------|------|
| Method not found | `{ code: 404, message: "Method not found" }` |
| Handler error | `{ code: 500, message: "Internal error" }` |
| Access denied | `{ code: 403, message: "Access denied" }` |
