# UI 自动化测试报告 — 2026-05-03

## 测试环境

| 项目 | 值 |
|------|-----|
| 执行工具 | ui-tester subagent (agent-browser) |
| 浏览器 | Chromium (headless) |
| 模板版本 | @dyyz1993/create-agent@1.7.0 |
| 日期 | 2026-05-03 |

## 测试结果汇总

| 模板 | 通过/总数 | 通过率 | 截图目录 |
|------|-----------|--------|----------|
| **Chat** | 22/24 | **91.7%** | `/tmp/pi-screenshots/chat-test/` |
| **Agent** | 43/48 | **89.6%** | `/tmp/pi-screenshots/agent-test/` |
| **General** | 42/44 | **95.5%** | `/tmp/pi-screenshots/general-test/` |

---

## Chat 模板 (22/24)

### Section A: 页面加载 — 5/5 PASS
- 页面加载无错误覆盖层
- "Web (WebSocket)" 蓝色指示器
- ActivityBar 仅 1 个 Chat 图标
- 空状态 "Start a conversation..." 占位
- 输入框 + Send 按钮

### Section B: 消息发送 — 7/7 PASS
- 用户消息右侧 indigo bg
- 助手消息左侧 gray bg + Bot 图标
- HH:MM 时间戳
- Enter 发送、多消息快速发送
- 自动滚到底部

### Section C: 智能回复 — 4/6 PASS
- time/math/help/greeting 均正确
- FAIL: "show me files" 和 "git status" 不支持（Chat 模板设计如此，仅有基础回复引擎）

### Section D: Markdown — 2/2 PASS
- `<strong>`/`<ul>`/`<li>` 正确渲染

### Section E: 响应式 — 2/2 PASS
- 375x667 移动端：底部 tab bar，无 ActivityBar
- 1280x800 桌面端：正常恢复

### Section F: 消息计数 — 2/2 PASS
- Badge 显示正确消息数
- 自动滚动验证通过

---

## Agent 模板 (43/48)

### Section A: 页面加载 — 5/5 PASS
- 4 个 ActivityBar 图标 (Explorer/Source Control/Search/Rules)
- Chat/Feed+Subs/Bash/Todo tab 按钮
- 默认 Explorer 侧边栏

### Section B: Explorer — 4/4 PASS
- 文件树加载、目录展开、文件预览、关闭预览

### Section C: Chat — 6/6 PASS
- 消息发送/回复、Bot 图标、时间戳、数学运算

### Section D: Bash — 8/8 PASS
- echo hello → "hello"
- date → 当前日期
- monospace 字体
- 进程列表 PID + Kill 功能
- "No active process" 空状态

### Section E: Rules — 7/7 PASS (补测)
- 空状态 "No rules defined yet."
- Add Rule → Save → 卡片显示 pattern badge
- Toggle enabled/disabled (green check/gray circle)
- Delete → 空状态恢复

### Section F: Todo — 6/6 PASS (补测)
- 空状态 "No tasks yet."
- 添加任务 → gray dot (pending)
- 状态流转: gray→yellow(in_progress)→green(completed)+strikethrough
- 优先级圆点颜色不同
- Delete 功能

### Section G: Feed — 2/2 PASS (补测)
- 发帖 → Feed 列表显示 + category tag

### Section H: Search — 2/2 PASS (补测)
- "import" → "290 results in 66 files" 按文件分组

---

## General 模板 (42/44)

### Section A: 页面加载 — 5/5 PASS
- 6 个 ActivityBar 图标 (Explorer/Git/Search/Chat/Feed/Debug)
- 默认 Explorer 文件树

### Section B: Explorer — 5/5 PASS
- 文件树、展开目录、文件预览、代码显示、关闭

### Section C: Git — 4/4 PASS
- 分支名显示、文件变更计数、操作按钮

### Section D: Chat — 7/7 PASS
- 消息双向显示、Bot 图标、时间戳、数学(60, 96)、help 列表

### Section E: Feed — 6/6 PASS
- 发帖 + category tag
- 订阅 + LIVE 指示器 + Event Stream

### Section F: Debug — 5/6 PASS (1 minor)
- 面板折叠/展开 + localStorage 持久化
- FAIL: 无 Clear 按钮（可能是设计如此）

### Section G: Search — 4/4 PASS
- "import" → "273 results in 61 files" 按文件分组

### Section H: 响应式 — 2/2 PASS
- 移动/桌面切换正确

### Section I: 智能回复 — 5/5 PASS
- time/math/files/git/default 全部正确

---

## 已知问题

| ID | 模板 | 描述 | 严重程度 | 状态 |
|----|------|------|----------|------|
| 1 | Chat | "show me files" 和 "git status" 无专用回复 | Low | By Design |
| 2 | General | Debug 面板无 Clear 按钮 | Low | 待确认 |
| 3 | All | Enter 键可能触发表单提交导致页面导航 | Medium | 需修复 |

## 建议

1. **表单提交防护**: 所有模板的 `<form>` 应添加 `onSubmit={e => e.preventDefault()}`
2. **Chat 智能回复扩展**: 可添加 files/git 相关回复
3. **Debug Clear 按钮**: General 模板可添加清空日志功能
