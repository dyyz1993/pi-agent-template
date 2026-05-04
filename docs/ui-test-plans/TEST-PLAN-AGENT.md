# UI 自动化测试计划 — Agent 模板

> 使用 `ui-tester` subagent 执行，每个 Test Case 独立可运行

## 前置条件

```bash
npx @dyyz1993/pi-cli create test-agent --type agent --dir /tmp/test-agent
cd /tmp/test-agent && PORT=3120 VITE_PORT=5190 bun run dev:web
curl http://localhost:3120/health → {"status":"ok"}
```

## 测试矩阵

### A. 页面加载 & 布局

| ID | 测试项 | 操作 | 期望结果 |
|----|--------|------|----------|
| A1 | 页面加载 | 打开 `http://localhost:5190` | 无错误覆盖层，显示 Agent 界面 |
| A2 | 连接模式 | 检查标题栏 | "Web (WebSocket)" 蓝色标签 |
| A3 | ActivityBar 图标 | 检查左侧 | 4 个图标：Explorer、Source Control、Search、Rules |
| A4 | 中心 Tab 栏 | 检查顶部 | Chat、Feed+Subs、Bash、Todo 等 tab 按钮 |
| A5 | 默认面板 | 首次加载 | Explorer 侧边栏显示文件树 |

### B. Explorer 文件浏览器

| ID | 测试项 | 操作 | 期望结果 |
|----|--------|------|----------|
| B1 | 文件树加载 | 点击 Explorer 图标 | 显示项目根目录文件列表 |
| B2 | 展开目录 | 点击目录节点 | 子文件/目录展开显示 |
| B3 | 打开文件 | 点击文件节点 | 文件预览覆盖层显示 |
| B4 | 关闭预览 | 点击 X 按钮 | 预览关闭 |
| B5 | 刷新 | 点击刷新按钮 | 目录重新加载 |

### C. Chat 聊天

| ID | 测试项 | 操作 | 期望结果 |
|----|--------|------|----------|
| C1 | 发送消息 | 切换 Chat tab → 输入 "hi" → Send | 用户消息右侧显示 |
| C2 | Bot 回复 | 等待 1s | 助手消息左侧显示 + Bot 图标 |
| C3 | 时间戳 | 检查消息 | 每条消息旁有 HH:MM |
| C4 | Markdown | 发送 "help" | 回复含格式化列表 |
| C5 | 数学 | 发送 "what is 3 * 7" | 回复含 "21" |

### D. Bash 终端

| ID | 测试项 | 操作 | 期望结果 |
|----|--------|------|----------|
| D1 | Bash 面板 | 切换到 Bash tab | 显示命令输入框 + Run 按钮 |
| D2 | 执行命令 | 输入 "echo hello" → Run | 输出区域显示 "hello" |
| D3 | 等宽字体 | 检查输出区域 | font-family 为 monospace |
| D4 | 多命令 | 输入 "date" → Run → "whoami" → Run | 进程列表显示 2 个进程 |
| D5 | 进程标签 | 检查进程列表 | 显示 PID + 运行状态指示 |
| D6 | Kill 按钮 | 运行 "sleep 60" → 点击 Kill | 进程停止，显示退出码 |
| D7 | 退出码 | 执行 "exit 1" | 显示红色退出码 |
| D8 | 空状态 | 无进程时 | 显示 "No active process" 占位 |

### E. Rules 规则管理

| ID | 测试项 | 操作 | 期望结果 |
|----|--------|------|----------|
| E1 | Rules 面板 | 点击 ActivityBar Rules 图标 | 显示规则列表 + Add Rule 按钮 |
| E2 | 空状态 | 无规则时 | 显示 "No rules defined yet." |
| E3 | 添加规则 | 点击 Add Rule → 输入 name + pattern → Save | 新规则出现在列表 |
| E4 | 卡片样式 | 检查规则项 | 卡片式布局，含 pattern 标签 |
| E5 | 切换启用 | 点击规则 | enabled/disabled 状态切换，视觉指示变化 |
| E6 | 删除规则 | 悬停 → 点击删除按钮 | 规则从列表移除 |
| E7 | Tag 标签 | 添加 pattern 含 *.ts 的规则 | 显示 TS/TSX/JS/GEN 标签 |

### F. Todo 任务管理

| ID | 测试项 | 操作 | 期望结果 |
|----|--------|------|----------|
| F1 | Todo 面板 | 切换 Todo tab | 显示任务列表 + Add Todo 按钮 |
| F2 | 空状态 | 无任务时 | 显示 "No tasks yet." |
| F3 | 添加任务 | 点击 Add Todo → 输入内容 → Add | 新任务出现在列表 |
| F4 | 状态圆点 | 检查新任务 | gray 圆点（pending 状态） |
| F5 | 状态流转 | 点击状态圆点 | pending → yellow(in_progress) → green(completed) |
| F6 | 完成样式 | 完成 1 个任务 | 文字显示删除线 + 灰色 |
| F7 | 删除任务 | 悬停 → 点击删除按钮 | 任务从列表移除 |
| F8 | 优先级圆点 | 添加多个任务 | 前 3 个 orange，接下来 blue，其余 gray |

### G. Feed 订阅

| ID | 测试项 | 操作 | 期望结果 |
|----|--------|------|----------|
| G1 | Feed 面板 | 切换 Feed+Subs tab | 显示 New Post + Subscribe 区域 |
| G2 | 发帖 | 输入 author + content → Post | 新帖出现在 Feed 列表 |
| G3 | 分类标签 | 检查帖子 | category 显示为彩色标签 |
| G4 | 订阅 | 选择事件类型 → Subscribe | Event Stream 显示 LIVE 指示器 |

### H. Search 搜索

| ID | 测试项 | 操作 | 期望结果 |
|----|--------|------|----------|
| H1 | Search 面板 | 点击 Search 图标 | 显示搜索输入框 |
| H2 | 搜索 | 输入 "import" → Enter | 结果按文件分组，显示匹配数 |
| H3 | 清空 | 点击清除按钮 | 搜索框清空，结果消失 |

### I. RPC 接口验证

| ID | 测试项 | 方法 | 输入 | 期望输出 |
|----|--------|------|------|----------|
| I1 | health | GET | `/health` | `{ status: "ok" }` |
| I2 | auth | GET | `/info/` (无token) | 401 |
| I3 | system.ping | RPC | `{}` | `{ pong: true }` |
| I4 | system.hello | RPC | `{ name: "Bot" }` | `{ message: "Hello Bot!" }` |
| I5 | bash.execute | RPC | `{ command: "echo test" }` | `{ pid: number, output: "test\n" }` |
| I6 | bash.kill | RPC | `{ pid }` | `{ success: true }` |
| I7 | bash.listProcesses | RPC | `{}` | `{ processes: [...] }` |
| I8 | rules.list | RPC | `{}` | `{ rules: [...] }` |
| I9 | rules.add | RPC | `{ name: "TS", pattern: "**/*.ts" }` | `{ rule: {...} }` |
| I10 | rules.toggle | RPC | `{ id }` | `{ rule: {...} }` |
| I11 | rules.remove | RPC | `{ id }` | `{ success: true }` |
| I12 | todo.list | RPC | `{}` | `{ items: [...] }` |
| I13 | todo.add | RPC | `{ content: "Test" }` | `{ item: {...} }` |
| I14 | todo.update | RPC | `{ id, status: "completed" }` | `{ item: {...} }` |
| I15 | todo.remove | RPC | `{ id }` | `{ success: true }` |
| I16 | chat.send | RPC | `{ content: "hi" }` | `{ ok: true }` |
| I17 | feed.post | RPC | `{ content, category }` | `{ id: string }` |
| I18 | git.status | RPC | `{ repoPath }` | `{ branch, staged, changed, untracked }` |
| I19 | file.listDir | RPC | `{ path }` | `{ entries: [...] }` |

---

## ui-tester 调用示例

```
Task(
  subagent_type: "ui-tester",
  description: "Agent template full test",
  prompt: """
  Test the Agent template at http://localhost:5190.

  ## Test Cases:
  1. Page loads without error
  2. ActivityBar shows 4 icons (Explorer, Source Control, Search, Rules)
  3. Click Explorer → verify file tree loads
  4. Switch to Chat tab → send "hi" → verify bot reply
  5. Switch to Bash tab → run "echo hello" → verify output shows "hello"
  6. Click Rules icon → click Add Rule → add name="Test" pattern="**/*.ts" → Save
  7. Verify new rule appears with TS tag badge
  8. Switch to Todo tab → click Add Todo → add "Task 1" → Add
  9. Verify task appears with gray status dot (pending)
  10. Click status dot → verify turns yellow (in_progress) → click again → green (completed)
  11. Switch to Feed tab → post a message → verify it appears in feed list
  12. Take screenshots of each panel
  """
)
```
