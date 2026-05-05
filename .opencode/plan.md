# Pi Agent Template TDD 执行计划

## 开发原则
- **TDD 流程**: Red (写失败测试) → Green (最小实现通过) → Refactor (重构优化)
- **按模块提交**: 每个模块完成后独立 git commit
- **子任务执行**: 所有代码修改通过 subagent 完成

## 模块一：安全加固（rpc-core + handlers）

### 1.1 路径安全校验
- [ ] RED: 编写 path-security 单元测试（允许/拒绝/边界）
- [ ] GREEN: 实现 validatePath / isRpcPathAllowed
- [ ] REFACTOR: 提取为 shared/lib/path-security.ts
- [ ] 集成: file handler 所有方法使用 validatePath
- [ ] 提交: `feat(security): add path validation for RPC file handlers`

### 1.2 Bash 命令安全
- [ ] RED: 编写 bash 命令限制测试
- [ ] GREEN: 实现命令黑名单 + enableBash 开关
- [ ] 集成: server-config.ts 添加 enableBash 配置
- [ ] 提交: `feat(security): add bash command restriction and enable switch`

### 1.3 生产环境安全加固
- [ ] RED: 编写 config 校验测试
- [ ] GREEN: 生产环境强制 AUTH_TOKEN、CORS 可配置
- [ ] 提交: `feat(security): enforce auth token in production and configurable CORS`

## 模块二：RPC 核心健壮性（rpc-core 包）

### 2.1 错误处理修复
- [ ] RED: 编写错误处理测试（handler 异常、transport send 失败、消息格式错误）
- [ ] GREEN: 修复 server.ts 吞异常、handler try-catch 保护
- [ ] REFACTOR: 添加 isRPCMessage 运行时校验
- [ ] 提交: `fix(rpc): improve error handling in server and client`

### 2.2 WebSocket 心跳 + 重连退避
- [ ] RED: 编写心跳超时测试、重连退避测试
- [ ] GREEN: 实现 ping/pong 心跳、指数退避重连、clearTimeout
- [ ] REFACTOR: 抽取 reconnection strategy
- [ ] 提交: `feat(rpc): add WebSocket heartbeat and exponential backoff reconnection`

### 2.3 SSE 自动重连 + 订阅恢复
- [ ] RED: 编写 SSE 重连测试、订阅恢复测试
- [ ] GREEN: 实现 SSE 自动重连、client 端订阅重发
- [ ] 提交: `feat(rpc): add SSE auto-reconnect with subscription recovery`

### 2.4 API 一致性修复
- [ ] RED: 编写 subscribe 参数顺序测试
- [ ] GREEN: 统一 subscribe(event, handler, filter?) 参数顺序
- [ ] 提交: `fix(rpc): unify subscribe parameter order`

### 2.5 Transport 重复代码消除
- [ ] RED: 确保所有 transport 测试通过
- [ ] REFACTOR: 抽取 BaseTransport、合并 InMemory/IPC
- [ ] 提交: `refactor(rpc): extract BaseTransport to reduce duplication`

## 模块三：前端重构（agent 模板）

### 3.1 App.tsx 拆分
- [ ] RED: 为 useRpcInit / useSidebarResize 编写测试
- [ ] GREEN: 提取 hooks，创建 AppLayout 组件
- [ ] REFACTOR: App.tsx 精简到 ~100 行
- [ ] 提交: `refactor(frontend): extract hooks and layout from App.tsx`

### 3.2 ExplorerSidebar 去 Props Drilling
- [ ] RED: 编写 ExplorerSidebar 独立测试（直接用 store）
- [ ] GREEN: 组件内部直接使用 useExplorerStore
- [ ] 提交: `refactor(frontend): remove props drilling from ExplorerSidebar`

### 3.3 use-app-store 拆分
- [ ] RED: 为 connection/log/demo store 分别编写测试
- [ ] GREEN: 拆分为 use-connection-store / use-log-store / use-app-store
- [ ] 提交: `refactor(frontend): split use-app-store into focused stores`

## 模块四：工程化清理

### 4.1 eslint-plugin-rpc 提升为 workspace 包
- [ ] 创建 packages/eslint-plugin-rpc
- [ ] 各模板改为依赖引用
- [ ] 提交: `refactor: extract eslint-plugin-rpc as workspace package`

### 4.2 共享构建配置
- [ ] 抽取 templates/shared/vite-base.config.ts
- [ ] 抽取 templates/shared/eslint-base.config.mjs
- [ ] 提交: `refactor: extract shared vite and eslint configs`

### 4.3 pre-commit 优化
- [ ] 启用 lint-staged 替代全量 lint
- [ ] 提交: `chore: optimize pre-commit hook with lint-staged`

### 4.4 测试补充
- [ ] 补充 typed.ts 测试
- [ ] 补充 chat 模板测试
- [ ] npm test 改为运行全部测试
- [ ] 提交: `test: add typed.ts and chat template tests`

---

## 模块八：主题系统 + 多语言 (i18n)

### 8.1 主题系统
- [ ] RED: 编写 theme store 测试（light/dark 切换、持久化、系统偏好）
- [ ] GREEN: 创建 use-theme-store + CSS 变量系统 + Tailwind darkMode 配置
- [ ] REFACTOR: 提取硬编码颜色为语义化 CSS 变量
- [ ] 创建 ThemeToggle 组件
- [ ] 集成到 AppLayout
- [ ] 提交: `feat(theme): add light/dark theme system with CSS variables`

### 8.2 多语言 (i18n)
- [ ] RED: 编写 i18n 配置和翻译测试
- [ ] GREEN: 集成 react-i18next + 创建翻译文件 (en/zh)
- [ ] REFACTOR: 提取所有硬编码字符串到翻译文件
- [ ] 创建 use-locale-store + LanguageSwitcher 组件
- [ ] 提交: `feat(i18n): add internationalization with en/zh support`

### 8.3 ESLint i18n 规则
- [ ] RED: 编写 no-hardcoded-strings 规则测试
- [ ] GREEN: 实现 eslint-plugin-rpc/no-hardcoded-strings 规则
- [ ] 集成到模板 ESLint 配置
- [ ] 提交: `feat(eslint): add no-hardcoded-strings rule for i18n enforcement`

### 8.4 项目规则
- [ ] 创建 .opencode/rules/i18n-conventions.md — i18n 开发规范
- [ ] 创建 .opencode/rules/theme-conventions.md — 主题开发规范
- [ ] 更新 .trae/rules/ 添加 i18n 和主题规则
- [ ] 提交: `docs: add i18n and theme development rules and conventions`

### 8.5 测试 + 同步
- [ ] 补充 i18n 和主题相关的组件测试
- [ ] 同步到 chat/general 模板 + pi-cli
- [ ] 提交: `feat: sync i18n and theme to all templates`
