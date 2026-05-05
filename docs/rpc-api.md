# RPC API Reference

This document provides a complete reference for all RPC methods and events available in Pi Agent Template.

## Overview

The RPC framework supports 5 transport layers:
- **IPC** — Desktop mode (Electrobun)
- **WebSocket** — Web mode (browser)
- **SSE** — Server-Sent Events (one-way server push)
- **Stdio** — CLI integration
- **InMemory** — Testing

All methods are fully typed through `shared/modules/*.ts`. Use `createTypedClient<Methods, Events>()` for compile-time type checking.

---

## Methods

### System Module

Basic connectivity & debugging.

#### `system.ping`

Ping the server.

**Params:** `{}`

**Result:** `{ pong: boolean, timestamp: number, platform: string }`

#### `system.hello`

Greet the user.

**Params:** `{ name?: string }`

**Result:** `{ message: string, timestamp: number }`

#### `system.echo`

Echo back the input.

**Params:** `unknown`

**Result:** `unknown`

---

### File Module

File system operations.

#### `file.findProjectRoot`

Find the project root directory.

**Params:** `{}`

**Result:** `{ path: string }`

#### `file.listDir`

List directory contents.

**Params:** `{ path: string }`

**Result:**
```typescript
{
  entries: { name: string; path: string; type: "file" | "directory"; size?: number }[];
  basePath: string;
}
```

#### `file.readFile`

Read file content.

**Params:** `{ path: string }`

**Result:** `{ content: string, size: number }`

#### `file.createFile`

Create a new file.

**Params:** `{ dirPath: string, name: string }`

**Result:** `{ path: string }`

#### `file.createDir`

Create a new directory.

**Params:** `{ dirPath: string, name: string }`

**Result:** `{ path: string }`

#### `file.rename`

Rename a file or directory.

**Params:** `{ oldPath: string, newName: string }`

**Result:** `{ newPath: string }`

#### `file.delete`

Delete a file or directory.

**Params:** `{ path: string }`

**Result:** `{ ok: boolean }`

#### `file.copy`

Copy a file.

**Params:** `{ srcPath: string, destDir: string }`

**Result:** `{ path: string }`

---

### Chat Module

Chat messaging.

#### `chat.list`

List chat messages with pagination.

**Params:** `{ limit?: number, cursor?: string }`

**Result:**
```typescript
{
  messages: { id: string; role: "user" | "assistant"; content: string; timestamp: number }[];
  hasMore: boolean;
}
```

#### `chat.send`

Send a chat message.

**Params:** `{ content: string }`

**Result:** `{ ok: boolean }`

#### Events

| Event | Payload |
|-------|---------|
| `chat.message` | `{ id: string, role: "user" \| "assistant", content: string, timestamp: number }` |

---

### Bash Module

Shell command execution (Agent/General mode only).

#### `bash.execute`

Execute a shell command.

**Params:** `{ command: string, cwd?: string }`

**Result:** `{ pid: number, output: string }`

#### `bash.kill`

Kill a running process.

**Params:** `{ pid: number }`

**Result:** `{ success: boolean }`

#### `bash.listProcesses`

List all managed processes.

**Params:** `{}`

**Result:** `{ processes: Array<{ pid: number, command: string, running: boolean }> }`

#### Events

| Event | Payload |
|-------|---------|
| `bash.output` | `{ pid: number, data: string, stream: "stdout" \| "stderr" }` |
| `bash.exit` | `{ pid: number, code: number \| null }` |

---

### Git Module

Version control operations. All methods require `repoPath` parameter.

#### `git.status`

Get working tree status.

**Params:** `{ repoPath: string }`

**Result:**
```typescript
{
  staged: GitFileChange[];
  changed: GitFileChange[];
  untracked: string[];
  branch: string;
  ahead: number;
  behind: number;
}
```

#### `git.diff`

Get diff of changes.

**Params:** `{ repoPath: string, filePath: string, staged?: boolean }`

**Result:** `{ filePath: string, diff: string, oldContent: string, newContent: string }`

#### `git.log`

Get commit log.

**Params:** `{ repoPath: string, maxCount?: number }`

**Result:**
```typescript
{
  commits: { hash: string; shortHash: string; message: string; author: string; date: string }[];
}
```

#### `git.commitFiles`

List files changed in a specific commit.

**Params:** `{ repoPath: string, hash: string }`

**Result:** `{ files: GitFileChange[] }`

#### `git.commitFileDiff`

Get diff for a file in a specific commit.

**Params:** `{ repoPath: string, hash: string, filePath: string }`

**Result:** `{ filePath: string, diff: string, oldContent: string, newContent: string }`

#### `git.branches`

List all branches.

**Params:** `{ repoPath: string }`

**Result:** `{ branches: { name: string, isCurrent: boolean, isRemote: boolean }[] }`

#### `git.checkout`

Switch to a branch.

**Params:** `{ repoPath: string, branch: string }`

**Result:** `{ ok: boolean }`

#### `git.add`

Stage file changes.

**Params:** `{ repoPath: string, paths: string[] }`

**Result:** `{ ok: boolean }`

#### `git.reset`

Unstage file changes.

**Params:** `{ repoPath: string, paths: string[] }`

**Result:** `{ ok: boolean }`

#### `git.commit`

Create a commit.

**Params:** `{ repoPath: string, message: string }`

**Result:** `{ hash: string, shortHash: string }`

#### `git.push`

Push to remote.

**Params:** `{ repoPath: string }`

**Result:** `{ ok: boolean }`

#### `git.pull`

Pull from remote.

**Params:** `{ repoPath: string }`

**Result:** `{ ok: boolean }`

#### `git.worktreeList`

List git worktrees.

**Params:** `{ repoPath: string }`

**Result:** `{ worktrees: { path: string, branch: string, isMain: boolean }[] }`

#### Shared Type: `GitFileChange`

```typescript
interface GitFileChange {
  path: string;
  status: "modified" | "added" | "deleted" | "renamed" | "copied";
}
```

---

### Feed Module

Posts & channel subscription.

#### `feed.post`

Create a new post.

**Params:** `{ content: string, category: FeedCategory, author?: string }`

**Result:** `{ id: string }`

#### `feed.list`

List feed posts.

**Params:** `{ category?: FeedCategory, limit?: number }`

**Result:** `{ posts: FeedPost[] }`

#### Shared Types

```typescript
type FeedCategory = "tech" | "news" | "general";

interface FeedPost {
  id: string;
  content: string;
  category: FeedCategory;
  author: string;
  timestamp: number;
}
```

#### Events

| Event | Payload |
|-------|---------|
| `feed.update` | `FeedPost` |

---

### Timer Module

Timer & event push.

#### `timer.start`

Start the timer.

**Params:** `{}`

**Result:** `{ started?: boolean, alreadyRunning?: boolean }`

#### `timer.stop`

Stop the timer.

**Params:** `{}`

**Result:** `{ stopped: boolean }`

#### Events

| Event | Payload |
|-------|---------|
| `timer.tick` | `{ count: number, timestamp: number }` |

---

### Todo Module

Task management (Agent mode only).

#### `todo.list`

List all todos.

**Params:** `{}`

**Result:** `{ items: TodoItem[] }`

#### `todo.add`

Add a new todo.

**Params:** `{ content: string }`

**Result:** `{ item: TodoItem }`

#### `todo.update`

Update todo status.

**Params:** `{ id: string, status: TodoStatus }`

**Result:** `{ item: TodoItem }`

#### `todo.remove`

Remove a todo.

**Params:** `{ id: string }`

**Result:** `{ success: boolean }`

#### Shared Types

```typescript
type TodoStatus = "pending" | "in_progress" | "completed";

interface TodoItem {
  id: string;
  content: string;
  status: TodoStatus;
  createdAt: number;
}
```

---

### Rules Module

Rule management (Agent mode only).

#### `rules.list`

List all rules.

**Params:** `{}`

**Result:** `{ rules: Rule[] }`

#### `rules.add`

Add a new rule.

**Params:** `{ name: string, pattern: string }`

**Result:** `{ rule: Rule }`

#### `rules.toggle`

Toggle rule enabled/disabled.

**Params:** `{ id: string }`

**Result:** `{ rule: Rule }`

#### `rules.remove`

Remove a rule.

**Params:** `{ id: string }`

**Result:** `{ success: boolean }`

#### Shared Type: `Rule`

```typescript
interface Rule {
  id: string;
  name: string;
  pattern: string;
  enabled: boolean;
}
```

---

## Security

- All file operations are restricted to allowed root paths (see `path-security.ts`)
- Bash commands are validated against a blacklist (see `bash-security.ts`)
- WebSocket connections require token authentication
- Token comparison uses `timingSafeEqual` to prevent timing attacks

## Error Handling

| Scenario | Response |
|----------|----------|
| Method not found | `{ code: 404, message: "Method not found" }` |
| Handler error | `{ code: 500, message: "Internal error" }` |
| Access denied | `{ code: 403, message: "Access denied" }` |
| Timeout | Client-side rejection with timeout error |

## Adding New Methods

1. Add type definition in `shared/modules/<name>.ts`
2. Extend `RPCMethods` (and `RPCEvents` if needed) in `shared/rpc-schema.ts`
3. Add handler in `handlers/<name>.ts` — auto-discovered, no registration needed
