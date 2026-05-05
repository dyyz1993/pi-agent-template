# UI 自动化测试计划 — Chat 模板

> 使用 `ui-tester` subagent 执行，每个 Test Case 独立可运行

## 前置条件

```bash
# 1. 创建项目
npx @dyyz1993/create-agent create test-chat --type chat --dir /tmp/test-chat

# 2. 启动 dev server
cd /tmp/test-chat && PORT=3110 VITE_PORT=5180 bun run dev:web

# 3. 确认启动
curl http://localhost:3110/health → {"status":"ok"}
```

## 测试矩阵

### A. 页面加载 & 布局

| ID | 测试项 | 操作 | 期望结果 |
|----|--------|------|----------|
| A1 | 页面加载 | 打开 `http://localhost:5180` | 无错误覆盖层，显示聊天界面 |
| A2 | 连接模式指示 | 检查标题栏 | 显示 "Web (WebSocket)" 蓝色标签 |
| A3 | ActivityBar | 检查左侧图标栏 | 只有 1 个 Chat 图标（MessageSquare） |
| A4 | 空消息状态 | 首次加载无历史 | 显示 "Start a conversation..." 占位文本 |
| A5 | 输入区域 | 检查底部 | 有文本输入框 + Send 按钮，placeholder 包含 "message" |

### B. 消息发送

| ID | 测试项 | 操作 | 期望结果 |
|----|--------|------|----------|
| B1 | 发送消息 | 输入 "hi" → 点击 Send | 用户消息气泡出现在右侧（indigo bg） |
| B2 | Bot 自动回复 | 等待 1s | 助手消息出现在左侧（gray bg），含问候内容 |
| B3 | Bot 图标 | 检查助手消息 | 左侧有 Bot 图标（indigo-400） |
| B4 | 时间戳 | 检查消息旁 | 每条消息旁有 HH:MM 格式时间 |
| B5 | Enter 发送 | 输入 "hello" → 按 Enter | 消息发送成功 |
| B6 | Shift+Enter 换行 | 输入 "line1" → Shift+Enter → "line2" → Enter | 发送含换行的消息 |
| B7 | 消息计数 | 检查标题栏 | badge 显示正确的消息数量 |
| B8 | 自动滚动 | 发送多条消息 | 列表自动滚到底部 |

### C. 智能回复模式

| ID | 测试项 | 输入内容 | 期望回复包含 |
|----|--------|----------|-------------|
| C1 | 问候 | "hi" | 问候语（Hello / Hi / Hey） |
| C2 | 时间 | "what time is it" | 当前时间 HH:MM |
| C3 | 数学 | "what is 12 * 8" | "96" |
| C4 | 数学除法 | "10 / 3" | "3.3333" |
| C5 | 帮助 | "help" | 功能列表 |
| C6 | 文件 | "show me files" | 文件浏览器说明 |
| C7 | Git | "git status" | Git 面板说明 |
| C8 | 未知输入 | "xyzabc123" | 默认回复 |

### D. Markdown 渲染

| ID | 测试项 | 验证方式 | 期望结果 |
|----|--------|----------|----------|
| D1 | 代码块 | 发送含 ` ```js\ncode\n``` ` 的消息 | 代码块有语法高亮，nightOwl 主题深色背景 |
| D2 | 行内代码 | 助手回复中含 `code` | 灰色背景的行内代码 |
| D3 | 列表 | 发送 "help" | 回复含项目列表（bullet points） |
| D4 | 粗体 | 检查时间回复 | 日期部分为粗体文字 |

### E. RPC 接口验证

| ID | 测试项 | 调用方式 | 期望结果 |
|----|--------|----------|----------|
| E1 | health | `GET /health` | `{"status":"ok"}` |
| E2 | auth 拒绝 | `GET /info/` (无 token) | 401 Unauthorized |
| E3 | WS auth 拒绝 | 连接 `ws://host/ws?token=wrong` | 连接关闭 code=4001 |
| E4 | system.ping | RPC call | `{ pong: true, timestamp: number }` |
| E5 | system.hello | RPC call `{ name: "Test" }` | `{ message: "Hello Test!" }` |
| E6 | system.echo | RPC call `{ foo: "bar" }` | 返回相同对象 |
| E7 | chat.list | RPC call `{ limit: 10 }` | `{ messages: [...], hasMore: boolean }` |
| E8 | chat.send | RPC call `{ content: "test" }` | `{ ok: true }` + 触发 chat.message 事件 |
| E9 | 消息持久化 | 发送消息 → 刷新页面 → chat.list | 历史消息保留 |

### F. 响应式布局

| ID | 测试项 | 操作 | 期望结果 |
|----|--------|------|----------|
| F1 | 桌面布局 | viewport 1280x800 | 左侧 ActivityBar + 右侧 ChatPanel |
| F2 | 移动布局 | viewport 375x667 | 底部 MobileTabBar + 无 ActivityBar |
| F3 | 标题栏隐藏 | 移动端 | 标题栏不显示 |

### G. 历史加载

| ID | 测试项 | 操作 | 期望结果 |
|----|--------|------|----------|
| G1 | 历史加载 | 有历史消息时刷新页面 | 自动加载并显示历史消息 |
| G2 | 历史消息时间戳 | 检查历史消息 | 每条都有时间戳 |
| G3 | 历史消息气泡方向 | 检查历史消息 | user 右对齐，assistant 左对齐 |

---

## ui-tester 调用示例

```
Task(
  subagent_type: "ui-tester",
  description: "Chat template full test",
  prompt: """
  Test the Chat template at http://localhost:5180.

  ## Test Cases to Execute:
  1. Verify page loads without error overlay
  2. Verify "Web (WebSocket)" mode indicator in title bar
  3. Verify ActivityBar has exactly 1 Chat icon
  4. Verify empty state shows "Start a conversation..."
  5. Type "hi" in the input and click Send
  6. Wait 1s, verify bot reply appears on the left side
  7. Verify bot icon appears next to assistant message
  8. Verify timestamps appear next to messages (HH:MM format)
  9. Type "what is 10 * 5" and send, verify reply contains "50"
  10. Type "help" and send, verify reply contains a list of capabilities
  11. Take a screenshot of the final state

  Save screenshots to /tmp/test-chat-results/
  """
)
```
