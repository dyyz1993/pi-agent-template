# Pi Agent Template 项目审查与优化大纲

## 会话信息

- **会话ID**: session-001
- **创建时间**: 2026-05-05
- **最后更新**: 2026-05-05
- **审查类型**: 全面架构审查 + TDD 开发优化（全量完成）

## 项目概览

- **性质**: AI Agent 桌面应用脚手架（Monorepo）
- **技术栈**: Electrobun + React + Vite + Bun + Zustand + 自研 RPC 框架
- **核心模块**: rpc-core, pi-cli, 3个应用模板(agent/chat/general)

## 全部改进统计

### 提交数量: 40+ 次

### 安全加固

- path-security.ts: 路径校验防遍历攻击
- bash-security.ts: 命令黑名单 + enableBash 开关
- CORS 可配置化（不再硬编码 \*）
- 配置校验 parseEnvInt (NaN/越界 fallback)
- timingSafeEqual 防 timing attack
- ErrorBoundary 防白屏

### RPC 核心健壮性

- server/client onError 回调（不再吞异常）
- handler try-catch 保护订阅者隔离
- WebSocket ping/pong 心跳 + 指数退避重连
- SSE 自动重连 + 订阅恢复 + isConnected 状态修正
- subscribe 参数顺序统一 (event, handler, filter?)
- BaseTransport 抽象消除 85% 重复
- RPCMessage 运行时校验

### 前端架构重构

- App.tsx: 288→38行 (agent), 284→38行 (general)
- use-app-store → connection/log/app 三拆分
- ExplorerSidebar: 16 props → 直接用 store
- useRpcInit/useSidebarResize hooks 提取
- AppLayout 组件化

### 主题系统

- use-theme-store: light/dark + localStorage 持久化
- 28 个语义化 CSS 变量 (:root + .dark)
- 220+ 处硬编码颜色替换为 CSS 变量
- TailwindCSS darkMode: "class"
- ThemeToggle 组件（太阳/月亮图标）

### 多语言 i18n

- react-i18next + i18next-browser-languagedetector
- en.json + zh.json (100+ keys)
- 14+ 组件硬编码字符串 → t() 替换
- use-locale-store + LanguageSwitcher

### 工程化

- eslint-plugin-rpc: workspace 包（消除 5 份副本）
- no-hardcoded-strings ESLint 规则
- 共享 vite/vitest config（消除 255 行）
- 共享 http-routes + async logger（消除 690 行）
- lint-staged + commitlint
- GitLab CI 缓存 + vite chunk splitting
- .vscode/extensions.json + settings.json
- .nvmrc (Node 22)

### 测试

| 模块     | 测试数   | 文件数  |
| -------- | -------- | ------- |
| rpc-core | 321      | 8       |
| agent    | 182      | 27      |
| chat     | 66       | 11      |
| general  | 53       | 7       |
| E2E      | 23       | 1       |
| **总计** | **~645** | **54+** |

### 规则体系

- ESLint: 7 条 RPC 规则 + no-hardcoded-strings
- commitlint: conventional commits
- .opencode/rules: i18n + theme 规范
- .trae/rules: memory + rpc-conventions + logging + i18n-theme
- lint-staged: 增量 lint 检查

### 文档

- README.md: 架构概览、特性、开发指南
- CONTRIBUTING.md: 开发环境、工作流、代码规范
- CHANGELOG.md: [Unreleased] 完整记录
- docs/rpc-api.md: 40+ RPC 方法完整参考
- docs/adr/: 3 份架构决策记录

## Progress

### Done

- **Playwright E2E 真实后端连接**: 去掉 MockWebSocket，所有 E2E 测试走真实 Bun server + WebSocket RPC
  - 新增 Bun.serve() 静态文件服务器（替代 npx serve）
  - 通过 localStorage 注入 WS URL + token（page.addInitScript）
  - CI 验证 ALL GREEN（27/27 jobs）
- **Playwright 全局错误收集**: 新增 e2e/fixtures.ts，自动收集 console.error + pageerror + requestfailed
  - { auto: true } fixture，每个 test 结束后自动断言零错误
  - 覆盖页面加载 + 用户交互全生命周期
- **三模板安全增强同步**: agent → chat/general 同步
  - ws-handler 心跳检测（30s ping + pong 超时）
  - api-client rpc-cache 缓存层
  - tsconfig.ipc.json IPC 编译配置
  - three.d.ts 类型声明
- **pi-cli 镜像全量同步**: rsync --delete，三模板 0 差异（agent 160 files, chat 72, general 101）

## Key Decisions

- E2E 测试用真实后端 + WebSocket，不用 MockWebSocket（用户要求）
- 桌面端自动化测试：Web E2E 覆盖 90% + IPC 编译检查覆盖桌面特有功能（Electrobun 无 headless 模式）
- 三模板不同步功能模块（bash/feed/file/git/rules/timer/todo 是 agent 独有的），只同步安全增强
