# Pi Agent Template — 开发规范与思路总结

> 本文档汇总项目所有的开发规范、架构决策和工程实践。
> 从这次 Phase 0-3 + 安全加固 + CI 的完整改造中提炼。

---

## 一、架构核心原则

### 1.1 分层架构

```
┌─────────────────────────────────────────────────────────┐
│  Transport 层（通信抽象）                                  │
│  IPC / WebSocket / SSE / Stdio / InMemory               │
│  → 同一套业务代码，通过 Transport 接口自动适配部署模式       │
├─────────────────────────────────────────────────────────┤
│  Gateway 层（网关鉴权）                                    │
│  ws-handler.ts（WS token 校验 + 心跳）                     │
│  http-routes.ts（HTTP Bearer token + CORS）               │
│  → 所有外部访问必须经过网关的 token 校验                     │
├─────────────────────────────────────────────────────────┤
│  Handler 层（业务逻辑）                                    │
│  每个 handler = 一个 register() 函数 + 独立状态闭包         │
│  → 每个 RPCServer 实例拥有隔离的状态                        │
├─────────────────────────────────────────────────────────┤
│  RPC Core 层（框架）                                      │
│  RPCServer / RPCClient / Transport 接口 / typed 封装      │
│  → 框架不关心通信方式，只依赖 Transport 接口                │
└─────────────────────────────────────────────────────────┘
```

### 1.2 三种部署模式，同一套代码

| 模式           | Transport       |  需要 Token  | 命令                                           |
| -------------- | --------------- | :----------: | ---------------------------------------------- |
| **桌面端**     | Electrobun IPC  |      ❌      | `bun run dev`                                  |
| **Web 应用**   | WebSocket       |      ✅      | `bun run dev:web`                              |
| **独立服务器** | WebSocket       |      ✅      | `bun run dev:server`                           |
| **混合模式**   | IPC + WebSocket | IPC❌ / WS✅ | `ENABLE_WEB_SERVICE=true bun src/bun/index.ts` |

### 1.3 工厂模式复用

Web 服务器启动逻辑封装为 `createWebServer()` 工厂函数：

- `server.ts`（Web 入口）和 `bun/index.ts`（桌面混合入口）共用
- 工厂只负责创建 HTTP + WS 服务
- 调用层负责端口文件写入、进程注册、信号处理

---

## 二、TDD 开发流程

### 2.1 核心循环

```
🔴 写失败测试 → 🟢 写最小实现 → 🔵 重构 → 重复
```

### 2.2 分层测试策略

| 层级           | 工具                   | 覆盖内容                    | 运行方式                        |
| -------------- | ---------------------- | --------------------------- | ------------------------------- |
| **RPC Core**   | `bun:test`             | Transport、订阅、心跳、重连 | `bun test tests/`               |
| **Handlers**   | `vitest`               | 隔离性、状态管理、边界条件  | `npx vitest run src/shared/`    |
| **Gateway**    | `vitest`               | Token 校验、WS 连接生命周期 | `npx vitest run src/gateway/`   |
| **Config**     | `vitest`               | 安全策略、动态 token        | `npx vitest run src/__tests__/` |
| **前端 Store** | `vitest` + `happy-dom` | 状态管理、RPC 调用          | `npx vitest run src/mainview/`  |
| **E2E**        | `Playwright`           | UI 自动化、端到端流程       | Playwright chromium             |

### 2.3 Handler 测试模式

```typescript
// 每个测试文件遵循统一模式
describe("feature handler", () => {
	let registeredHandlers: Record<string, Function>;

	beforeEach(() => {
		vi.resetModules(); // 隔离模块级状态
		registeredHandlers = {};
		const mockServer = {
			register: vi.fn((method, handler) => {
				registeredHandlers[method] = handler;
			}),
			emitEvent: vi.fn(),
		};
	});

	it("should do X when Y", async () => {
		// Arrange
		const { register } = await import("../my-handler");
		register(mockServer, { platform: "desktop" });

		// Act
		const result = await registeredHandlers["module.action"](params);

		// Assert
		expect(result).toEqual(expected);
	});
});
```

---

## 三、安全规范

### 3.1 Token 认证

| 规则                              | 实现                                      |
| --------------------------------- | ----------------------------------------- |
| 生产环境必须设置 `AUTH_TOKEN`     | `server-config.ts` 中 `throw new Error()` |
| 开发模式自动生成随机 token        | `dev-${randomUUID()}`                     |
| WS token 通过 Header 传递（优先） | `Sec-WebSocket-Protocol` header           |
| URL query token 作为 fallback     | `?token=xxx`                              |
| 使用 `timingSafeEqual` 防时序攻击 | `crypto.timingSafeEqual`                  |
| 日志中 token 打码                 | `token.substring(0, 4) + "***"`           |

### 3.2 文件路径安全

| 攻击向量               | 防护层     | 方法                                |
| ---------------------- | ---------- | ----------------------------------- |
| `../` 路径穿越         | HTTP + RPC | `isPathAllowed()` + `ALLOWED_ROOTS` |
| 绝对路径 `/etc/passwd` | HTTP + RPC | `resolve()` + 根目录限制            |
| `%00` null byte        | RPC        | `validatePath()` 检查               |
| `%2e%2e%2f` URL 编码   | HTTP + RPC | `decodeURIComponent` + `resolve()`  |
| Windows `\` 反斜杠     | HTTP + RPC | `resolve()` 统一处理                |

### 3.3 Handler 状态隔离

**核心原则**：每个 `register()` 调用创建独立的状态闭包。

```typescript
// ✅ 正确：状态在 register 内部
export function register(server: RPCServer, options: HandlerOptions): void {
  let items: Item[] = [];
  let idCounter = 1;
  server.register("module.add", async (params) => { ... });
}

// ❌ 错误：模块级变量，多连接共享状态
let items: Item[] = [];
export function register(server: RPCServer, options: HandlerOptions): void {
  server.register("module.add", async (params) => { ... });
}
```

### 3.4 并发文件安全

- 桌面端（长期运行）：固定路径 `~/.pi-agent/chat-history-desktop.json`
- Web 端（临时连接）：唯一路径 `~/.pi-agent/chat-history-web-{sessionId}.json`

---

## 四、代码风格规范

### 4.1 Import 路径（ESLint 强制）

**规则**：`rpc/no-deep-relative-imports` — 禁止超过 2 层 `../`

| 路径                 | 别名                             | 指向                 |
| -------------------- | -------------------------------- | -------------------- |
| `@shared/*`          | `templates/shared/*`             | 共享模块、类型、工具 |
| `@dyyz1993/rpc-core` | `packages/rpc-core/src/index.ts` | RPC 框架核心         |

```typescript
// ✅ 正确
import type { FeedCategory } from "@shared/modules/feed";
import { RPCServer } from "@dyyz1993/rpc-core";
import { helper } from "./utils"; // 同目录
import { types } from "../parent"; // 1 层

// ❌ 错误（lint 报错，指向 .opencode/rules/import-conventions.md）
import type { FeedCategory } from "../../../shared/modules/feed";
```

### 4.2 TypeScript

- 禁止 `any`，用 `unknown` 并收窄
- 公共 API 必须有显式返回类型
- 使用 `import type` 导入纯类型
- 组件文件 PascalCase，工具文件 camelCase
- 禁止 `@ts-ignore`，用 `@ts-expect-error` 并注释原因

### 4.3 RPC 方法

- 方法命名：`模块.动作`（如 `git.getStatus`）
- 类型定义在 `modules/*.ts`，handler 实现在 `handlers/*.ts`
- handler 必须包含输入验证和错误处理
- 错误使用 `RpcError` 类，包含 code 和 message
- 前端必须通过 `apiClient` 调用，禁止直接操作 WebSocket

### 4.4 i18n

- 所有 UI 文本通过 `t()` 获取
- Key 命名：`模块.功能.具体文本`
- 新增 key 必须同时更新 `en.json` 和 `zh.json`

### 4.5 主题

- 所有颜色通过 `var(--color-xxx)` 引用
- 变量必须同时在 `:root` 和 `.dark` 中定义
- 变量命名：`--color-{category}-{variant}`

---

## 五、CI/CD 规范

### 5.1 Pipeline 结构

```
ci.yml (每次 PR/push 触发)
├── lint          → ESLint + Prettier
├── type-check    → tsc --noEmit
├── test          → rpc-core (bun:test) + pi-cli
├── template-test → 3 模板 vitest
├── smoke-test    → CLI 创建项目 → lint → test → build
├── build-verify  → vite build → 检查 dist/
├── integration-test → E2E 集成
├── rpc-api-test  → 18 个 RPC 方法全量测试
└── e2e-ui        → Playwright UI 自动化

build.yml (main + 手动触发)
├── build-web     → 3 模板 vite build + artifact
├── build-desktop → macOS + Windows + Linux Electrobun 构建
├── smoke-server  → 启动服务 + health/token/文件测试
└── smoke-hybrid  → ENABLE_WEB_SERVICE=true 测试
```

### 5.2 Pre-commit Hooks

```bash
lint-staged → ESLint --fix + Prettier
bunx tsc --noEmit → 类型检查
commitlint → conventional commits 校验
```

### 5.3 自定义 ESLint 规则

| 规则                           | 功能                                        |
| ------------------------------ | ------------------------------------------- |
| `rpc/no-bare-method`           | 方法名必须 `module.action` 格式             |
| `rpc/no-direct-register`       | `server.register()` 只能在 handlers/ 目录内 |
| `rpc/schema-merge-only`        | rpc-schema.ts 只允许 extends 合并           |
| `rpc/module-file-naming`       | 模块文件命名/导出/前缀规范                  |
| `rpc/require-typed-register`   | 入口必须调用 registerAllHandlers            |
| `rpc/require-api-client`       | 前端必须通过 apiClient 调用                 |
| `rpc/no-hardcoded-strings`     | JSX 禁止硬编码字符串                        |
| `rpc/no-deep-relative-imports` | 禁止超过 2 层 ../（指向 rules 文档）        |

---

## 六、混合模式设计思路

### 6.1 核心问题

> 桌面端能否同时提供 Web 服务，让局域网设备通过浏览器访问？

### 6.2 解决方案

```
┌──────────────────────────────────────┐
│  Electrobun 桌面应用                    │
│                                       │
│  ┌────────────┐  ┌─────────────────┐ │
│  │ Webview     │  │ HTTP + WS Server │ │
│  │ (前端 UI)   │  │ :3100           │ │
│  │             │  │                  │ │
│  │  IPC 直连   │  │  WS + Token     │ │
│  │  (无 token) │  │  (需要 token)    │ │
│  └─────┬──────┘  └────────┬─────────┘ │
│        │                  │            │
│  ┌─────▼──────────────────▼─────────┐ │
│  │        共享 Handler 层             │ │
│  │  register() × 2（各自独立状态）    │ │
│  └──────────────────────────────────┘ │
└──────────────────────────────────────┘
          │
    局域网浏览器通过 WS 连接
```

### 6.3 关键设计决策

| 决策                              | 理由                                |
| --------------------------------- | ----------------------------------- |
| IPC 和 WS 用独立的 RPCServer 实例 | 状态隔离（Phase 0 前置依赖）        |
| WS 需要认证，IPC 不需要           | IPC 是本机直连，WS 可能被远程访问   |
| 混合模式默认关闭                  | 不破坏现有桌面端行为                |
| 每次启动生成随机 token            | 局域网场景安全，避免默认 token 泄露 |
| web-server.ts 作为工厂函数        | server.ts 和 bun/index.ts 共用      |

---

## 七、Git 提交规范

### Conventional Commits

```
feat(scope): 新功能
fix(scope): 修复 bug
test(scope): 测试
docs(scope): 文档
chore(scope): 构建/工具/依赖
refactor(scope): 重构
```

### 大型改造拆分策略

本次改造拆为 13 个 commit，按依赖顺序：

```
1. feat(rpc-core)     ← 无依赖，底层框架
2. feat(templates)    ← 依赖 rpc-core
3. feat(ci)           ← 独立
4. chore(deps)        ← 独立
5. test(security)     ← 依赖 templates
6. fix(ci)            ← 修复 CI 反馈
7. fix(lint)          ← 新增 ESLint 规则
```

**原则**：每个 commit 保持独立可编译、可测试。

---

## 八、踩坑记录

| 问题                                | 根因                                     | 解法                                |
| ----------------------------------- | ---------------------------------------- | ----------------------------------- |
| `@shared` 别名在 bun 运行时无法解析 | tsconfig paths 只是编译时，bun/vite 不认 | 改用相对路径或 vite resolve.alias   |
| CI smoke-test 找不到 `ws` 模块      | package.json 只有 `@types/ws` 没有 `ws`  | 添加 `ws` 到 devDependencies        |
| CI integration-test token 不匹配    | server 启动没设 AUTH_TOKEN → 随机 token  | spawn 时注入 AUTH_TOKEN env         |
| vitest 4.x + jest-dom 失败          | vitest 4 移除了 CJS require              | 改用 ESM `import * as matchers`     |
| `npx tsc` 解析到错误包              | npm 上有 `tsc@2.0.4` 占位包              | 改用 `bunx tsc`                     |
| handler 多连接状态冲突              | 模块级变量被所有连接共享                 | 状态移入 register() 闭包            |
| shared/ 在独立项目中不存在          | monorepo 的相对路径超出项目根            | http-routes.ts 内联到每个模板       |
| 符号链接路径穿越                    | resolve() 跟随符号链接                   | 建议生产环境用 `fs.realpath()` 校验 |

---

## 九、E2E 测试规范

### 9.1 Playwright 配置

- 配置文件：`playwright.config.ts`（根目录）
- 测试目录：`e2e/`
- headless: true, workers: 3
- 浏览器：chromium only
- 重试：1 次

### 9.2 真实后端连接

- **禁止使用 MockWebSocket**
- 通过 `e2e/fixtures.ts` 的 `page.addInitScript` 在 localStorage 注入 `rpc-websocket-url` 和 `rpc-auth-token`
- 前端从 localStorage 读取 WS URL + token，直连真实 Bun 后端
- 后端 AUTH_TOKEN 设为固定值 `pi-agent-template-token`（与前端默认值一致）

### 9.3 全局错误收集

- `e2e/fixtures.ts` 的 `browserErrors` fixture（`{ auto: true }`）自动收集：
  - `console.error` — 控制台错误
  - `pageerror` — 未捕获 JS 运行时异常
  - `requestfailed` — 网络请求失败
- 每个 test 结束后自动断言 `expect(filtered).toEqual([])`
- 允许的错误（过滤列表）：favicon、404、net::ERR_CONNECTION_REFUSED、WebSocket

### 9.4 测试启动流程（CI）

1. `bun run scripts/create.ts` 创建临时项目
2. `AUTH_TOKEN=pi-agent-template-token bun src/server.ts` 启动后端
3. `npx vite build` 构建前端
4. `Bun.serve()` 在 5173 端口 serve 静态文件
5. `npx playwright test` 运行测试

### 9.5 桌面端测试

- CI 上无法启动 Electrobun GUI（无 headless 模式、macOS runner 无活跃 WindowServer）
- 桌面端通过分层测试覆盖：
  - Playwright Web E2E → UI/DOM/交互（90% 业务逻辑）
  - `build-desktop` → 构建产物验证（macOS/Win/Linux）
  - `tsc --noEmit --project tsconfig.ipc.json` → IPC Transport 编译检查
  - 本地手动 → electrobun dev 真实桌面验证
