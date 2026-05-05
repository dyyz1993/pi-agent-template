# UI 自动化测试计划 — General 模板

> 使用 `ui-tester` subagent 执行，每个 Test Case 独立可运行

## 前置条件

```bash
npx @dyyz1993/create-agent create test-general --type general --dir /tmp/test-general
cd /tmp/test-general && PORT=3100 VITE_PORT=5173 bun run dev:web
curl http://localhost:3100/health → {"status":"ok"}
```

## 测试矩阵

### A. 页面加载 & 布局

| ID | 测试项 | 操作 | 期望结果 |
|----|--------|------|----------|
| A1 | 页面加载 | 打开 `http://localhost:5173` | 无错误覆盖层，显示 General 界面 |
| A2 | 连接模式 | 检查标题栏 | "Web (WebSocket)" 蓝色标签 |
| A3 | ActivityBar 图标 | 检查左侧 | 6 个图标：Explorer、Git、Search、Chat、Feed、Debug |
| A4 | 中心 Tab 栏 | 检查顶部 | Chat、Feed+Subs 等 tab 按钮 |
| A5 | 默认面板 | 首次加载 | Explorer 侧边栏显示文件树 |

### B. Explorer 文件浏览器

| ID | 测试项 | 操作 | 期望结果 |
|----|--------|------|----------|
| B1 | 文件树加载 | 点击 Explorer 图标 | 显示项目根目录文件列表 |
| B2 | 展开目录 | 点击 src/ 目录 | 子文件/目录展开（main.ts, gateway/, mainview/, shared/） |
| B3 | 打开文件 | 点击 main.ts | 文件预览覆盖层显示，含文件路径标题 |
| B4 | 代码预览 | 检查预览内容 | 显示文件源码内容 |
| B5 | 关闭预览 | 点击 X 按钮 | 预览关闭 |
| B6 | 刷新 | 点击刷新按钮 | 目录重新加载 |

### C. Git 面板

| ID | 测试项 | 操作 | 期望结果 |
|----|--------|------|----------|
| C1 | Git 面板 | 点击 Source Control 图标 | 显示 Git 状态面板 |
| C2 | 分支显示 | 检查顶部 | 当前分支名称（如 "master"） |
| C3 | 变更列表 | 检查面板 | 显示 staged/changed/untracked 文件数 |
| C4 | 无变更状态 | 新项目 | 显示 "No changes" 或空列表 |

### D. Chat 聊天

| ID | 测试项 | 操作 | 期望结果 |
|----|--------|------|----------|
| D1 | Chat 面板 | 切换 Chat tab | 显示聊天界面 |
| D2 | 发送消息 | 输入 "hi" → Send | 用户消息右侧（indigo bg） |
| D3 | Bot 回复 | 等待 1s | 助手消息左侧（gray bg）+ Bot 图标 |
| D4 | 时间戳 | 检查消息 | HH:MM 格式 |
| D5 | Markdown | 发送 "help" | 回复含格式化列表 |
| D6 | 数学 | 发送 "what is 15 * 4" | 回复含 "60" |
| D7 | 消息计数 | 检查标题栏 badge | 显示正确消息数 |

### E. Feed & Subscriptions

| ID | 测试项 | 操作 | 期望结果 |
|----|--------|------|----------|
| E1 | Feed 面板 | 切换 Feed+Subs tab | 显示 New Post + Subscribe 区域 |
| E2 | 发帖 | 输入 author + content → Post | 新帖出现在 Feed 列表 |
| E3 | 分类标签 | 检查帖子 | category 显示为彩色标签 |
| E4 | 订阅 | 选择事件类型 → Subscribe | Event Stream 显示 LIVE 指示器 |
| E5 | 事件推送 | 触发已订阅事件 | Event Stream 实时显示事件数据 |

### F. Debug 调试面板

| ID | 测试项 | 操作 | 期望结果 |
|----|--------|------|----------|
| F1 | Debug 面板 | 点击 Debug 图标 | 显示调试控制台 |
| F2 | 折叠面板 | 点击面板标题 | 面板折叠/展开 |
| F3 | 日志显示 | 执行操作产生日志 | 日志实时显示在面板中 |
| F4 | 清空 | 点击 Clear 按钮 | 日志清空 |
| F5 | localStorage 持久化 | 刷新页面 | 面板折叠状态保持 |

### G. Search 搜索

| ID | 测试项 | 操作 | 期望结果 |
|----|--------|------|----------|
| G1 | Search 面板 | 点击 Search 图标 | 显示搜索输入框 |
| G2 | 搜索 | 输入 "import" → Enter | 结果按文件分组，显示匹配数 |
| G3 | 清空 | 点击清除按钮 | 搜索框清空，结果消失 |

### H. Diff 对比

| ID | 测试项 | 操作 | 期望结果 |
|----|--------|------|----------|
| H1 | Diff 面板 | 切换到 Diff tab | 显示文件对比界面 |
| H2 | 选择文件 | 选择一个已修改文件 | 左右分栏显示对比 |

### I. 响应式布局

| ID | 测试项 | 操作 | 期望结果 |
|----|--------|------|----------|
| I1 | 桌面布局 | viewport 1280x800 | 左侧 ActivityBar + 中间内容区 |
| I2 | 移动布局 | viewport 375x667 | 底部 MobileTabBar + 无 ActivityBar |
| I3 | 标题栏自适应 | 调整窗口大小 | 标题栏正确响应 |

### J. RPC 接口验证

| ID | 测试项 | 方法 | 输入 | 期望输出 |
|----|--------|------|------|----------|
| J1 | health | GET | `/health` | `{ status: "ok" }` |
| J2 | auth | GET | `/info/` (无token) | 401 |
| J3 | auth valid | GET | `/info/` (valid token) | 200 + server info |
| J4 | system.ping | RPC | `{}` | `{ pong: true, timestamp: number }` |
| J5 | system.hello | RPC | `{ name: "Test" }` | `{ message: "Hello Test!" }` |
| J6 | system.echo | RPC | `{ foo: "bar" }` | `{ foo: "bar" }` |
| J7 | system.info | RPC | `{}` | `{ name, version, uptime, transports }` |
| J8 | timer.list | RPC | `{}` | `{ timers: [...] }` |
| J9 | timer.start | RPC | `{ duration: 5000, label: "test" }` | `{ timer: {...} }` |
| J10 | timer.stop | RPC | `{ id }` | `{ timer: {...} }` |
| J11 | chat.list | RPC | `{ limit: 10 }` | `{ messages: [...], hasMore: boolean }` |
| J12 | chat.send | RPC | `{ content: "hi" }` | `{ ok: true }` + chat.message 事件 |
| J13 | feed.post | RPC | `{ content, category }` | `{ id: string }` + feed.update 事件 |
| J14 | feed.list | RPC | `{}` | `{ posts: [...] }` |
| J15 | feed.subscribe | RPC | `{ events: ["chat.message"] }` | `{ subscriptionId: string }` |
| J16 | feed.unsubscribe | RPC | `{ subscriptionId }` | `{ success: true }` |
| J17 | git.status | RPC | `{ repoPath }` | `{ branch, staged, changed, untracked }` |
| J18 | git.diff | RPC | `{ path, staged }` | `{ diff: string }` |
| J19 | git.log | RPC | `{ maxCount: 10 }` | `{ commits: [...] }` |
| J20 | file.listDir | RPC | `{ path }` | `{ entries: [...] }` |
| J21 | file.readFile | RPC | `{ path }` | `{ content: string }` |
| J22 | search.search | RPC | `{ query, directory }` | `{ results: [...], totalMatches }` |

### K. 智能回复验证

| ID | 输入 | 期望回复包含 |
|----|------|-------------|
| K1 | "hi" | 问候语 |
| K2 | "what time is it" | 当前时间 HH:MM |
| K3 | "what is 12 * 8" | "96" |
| K4 | "help" | 功能列表 |
| K5 | "show me files" | 文件浏览器说明 |
| K6 | "git status" | Git 面板说明 |
| K7 | "xyzabc123" | 默认回复 |

### L. 事件系统

| ID | 测试项 | 操作 | 期望结果 |
|----|--------|------|----------|
| L1 | chat.message 事件 | chat.send | WS 推送 chat.message 事件给订阅者 |
| L2 | feed.update 事件 | feed.post | WS 推送 feed.update 事件给订阅者 |
| L3 | timer.tick 事件 | timer.start(3s) | WS 推送 timer.tick 事件 |
| L4 | timer.complete 事件 | timer 到期 | WS 推送 timer.complete 事件 |

---

## ui-tester 调用示例

```
Task(
  subagent_type: "ui-tester",
  description: "General template full test",
  prompt: """
  Test the General template at http://localhost:5173.

  ## Test Cases:
  1. Page loads without error overlay
  2. ActivityBar shows 6 icons (Explorer, Git, Search, Chat, Feed, Debug)
  3. Click Explorer → expand src/ directory → click main.ts → verify file preview opens
  4. Close file preview → click Source Control icon → verify Git status panel
  5. Switch to Chat tab → send "hi" → verify bot reply on left with Bot icon
  6. Send "what is 5 * 9" → verify reply contains "45"
  7. Switch to Feed tab → post a message → verify it appears in feed
  8. Click Debug icon → verify debug panel opens and is collapsible
  9. Click Search icon → type "import" → verify search results appear grouped by file
  10. Take screenshots of each panel/state

  Save screenshots to /tmp/test-general-results/
  """
)
```
