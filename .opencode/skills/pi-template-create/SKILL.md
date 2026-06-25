---
name: pi-template-create
version: "1.0.0"
description: >
  从零创建一个新的 pi-agent 模板类型（像 general/chat/agent/browser-agent 那样）。
  当用户说"新建一个模板"、"加一种模板类型"、"照着 browser-agent 再做一个"、"我想加个 xxx 模板"时使用此 Skill。
  本 Skill 覆盖：目录脚手架 → 端口规划 → 双模式配置 → CLI 注册 → 同步脚本 → 测试 → 发布校验的完整链路。
  注意：与 pi-template-dev（模板内部写代码的规范）不同，本 Skill 是"造模板本身"。
---

# Pi Template Create — 新模板创建规范

## 核心心智模型

一个 pi-agent 模板 = **共享骨架（不可改）+ 业务模块（你来写）+ CLI 注册（5 处必改）**。

```
templates/<your-template>/
  ├── 【骨架·完全相同】src/shared/lib/{web-server,port-registry,logger,path-security}.ts
  ├── 【骨架·完全相同】src/gateway/ipc-transport.ts
  ├── 【骨架·完全相同】scripts/dev.ts
  ├── 【骨架·配置工厂】vite.config.ts (3 行委托给 ../shared/vite-base.config.ts)
  ├── 【需改·端口】src/server-config.ts          ← 唯一必须改端口的地方
  ├── 【需改·业务】src/shared/{modules,handlers}/  ← 你的业务能力
  ├── 【需改·前端】src/mainview/                  ← React UI
  └── 【需改·文档】README.md, AGENTS.md
```

**铁律：骨架文件逐字节复制，不要自作主张重写。** 这些文件（web-server.ts 的端口协商、port-registry.ts 的多实例追踪、dev.ts 的双进程编排）经过反复验证，改一个字都可能让多实例并行开发坏掉。

---

## 完整流程（7 步）

### Step 1: 复制骨架

```bash
# 从最接近你需求的现有模板复制（推荐 browser-agent，它最新、最完整）
cp -R templates/browser-agent templates/<your-template>
# 清理产物和状态文件
cd templates/<your-template>
rm -rf node_modules dist build .server-port logs bun.lock
```

### Step 2: 规划端口（关键，避免多模板冲突）

打开 `src/server-config.ts`，**只改两处**：

```typescript
export const config = {
	// 改这里：给新模板一个不冲突的端口
	// 已占用：general=3100, chat=3100, agent=3100, browser-agent=5200
	// 建议：新模板用 5300 / 5400 ... 留出间隔
	port: parseEnvInt("PORT", process.env.PORT, 5300, 1024, 65535),
	// ...
	// Vite 端口也要同步改（与 PORT 配对，+2000 是惯例）
	// browser-agent: 5200/7200；新模板：5300/7300
	corsOrigin: process.env.CORS_ORIGIN || "http://localhost:7300",
} as const;
```

同步改 `.env` 和 `.env.example`：

```bash
PORT=5300
VITE_PORT=7300
```

**端口规划表（务必遵守，避免并发冲突）：**

| 模板          | Backend | Vite | 状态   |
| ------------- | ------- | ---- | ------ |
| general       | 3100    | 5173 | ✅     |
| chat          | 3100    | 5173 | ✅     |
| agent         | 3100    | 5173 | ✅     |
| browser-agent | 5200    | 7200 | ✅     |
| <你的新模板>  | 5300    | 7300 | 待分配 |

> 注意：端口协商机制会自动 +1 找空闲端口，但默认值不同能减少启动时的重试。详见 `src/shared/lib/web-server.ts` 的 `findAvailablePort`。

### Step 3: 裁剪/添加业务模块

遵循 `pi-rpc-module-dev` skill 的规范。骨架里有通用模块（system/file/chat/git/timer 等），按需保留或替换：

- **删模块**：删 `src/shared/modules/<x>.ts` + `src/shared/handlers/<x>.ts`，并在 `rpc-schema.ts` 的 extends 链移除，在 `handlers/index.ts` 移除 barrel export
- **加模块**：按 pi-rpc-module-dev 的 5 步流程

**关键：** `src/shared/modules/` 下的模块名会被 `update` 命令用来反推模板类型（见 Step 6），所以给新模板留一个**独特模块签名**。

### Step 4: 改 package.json

```jsonc
{
	"name": "<your-template>-app", // 改这里
	"version": "1.0.0",
	"description": "你的模板描述", // 改这里
	// dependencies 按业务需要增删
	// ⚠️ 保留这些占位符（copy.ts 会自动替换，不要手动改成项目名）：
	//   "com.piagent.template" / "com.piagent" / "@pi-agent/" / "Pi Agent Template"
}
```

> 占位符替换规则见 `packages/pi-cli/src/lib/copy.ts` 的 `copyAndReplace()`。用户创建项目时这些占位符会被替换成实际项目名，所以在**模板源码里必须保留占位符原样**。

### Step 5: 注册到 CLI（5 处必改）⚠️ 最容易漏

这是 `browser-agent` 踩过的坑——它只改了第 1 处，导致半接入。**5 处全改才完整：**

#### 5a. `packages/pi-cli/src/lib/templates.ts`

```typescript
const TEMPLATES: TemplateInfo[] = [
	// ...已有模板
	{
		type: "<your-template>",
		description: "你的模板描述",
		available: true,
		dir: "templates/<your-template>",
	},
];
```

#### 5b. `packages/pi-cli/package.json` 的 `sync-templates` 脚本

追加 3 段（rm + rsync + eslint-plugin 复制）：

```bash
rm -rf templates/<your-template> && \
rsync -a --exclude='node_modules' --exclude='dist' --exclude='build' --exclude='.server-port' --exclude='logs' --exclude='bun.lock' ../../templates/<your-template>/ templates/<your-template>/ && \
rsync -a ../../packages/eslint-plugin-rpc/ templates/<your-template>/eslint-plugin-rpc/ && \
```

并在 `prepublishOnly` 加校验：

```bash
"prepublishOnly": "test -d templates/general/src && test -d templates/chat/src && test -d templates/agent/src && test -d templates/<your-template>/src"
```

#### 5c. `packages/pi-cli/scripts/post-sync-templates.mjs`

```javascript
const templateNames = ["agent", "chat", "general", "<your-template>"]; // ← 加上
```

#### 5d. `packages/pi-cli/src/commands/update.ts` 的 `detectTemplateMeta()`

加一个能识别你模板的分支（检查某个特有模块），否则会被误判为 general：

```typescript
// 例：browser-agent 特有 browser 模块
if (modules.includes('browser')) return { type: 'browser-agent', ... };
```

#### 5e. `packages/pi-cli/src/__tests__/templates.test.ts`

```typescript
test("returns N templates", () => {
	expect(getAllTemplates()).toHaveLength(4); // ← 数字 +1
});
// 加 includes 断言、getTemplateInfo、resolveTemplateDir 用例
```

### Step 6: 测试

```bash
# 1. CLI 注册测试
cd packages/pi-cli && bun test src/__tests__/templates.test.ts

# 2. 同步脚本（验证模板能正确打进 npm 包）
cd packages/pi-cli && bun run sync-templates
# 检查 packages/pi-cli/templates/<your-template>/ 是否生成完整
# 重点验证：eslint.config.mjs 已改写成 ./eslint-plugin-rpc/index.js
#           package.json 已删除 workspace:* 依赖

# 3. 实际创建一个项目验证端到端
bun run packages/pi-cli/src/cli.ts create test-app --type <your-template>
cd test-app && bun run dev:web
```

### Step 7: 文档

- `README.md` — 含 RPC 模块表、环境变量表、项目结构树（参考 browser-agent）
- `AGENTS.md` — Agent 系统提示词

---

## 半接入陷阱（browser-agent 的真实教训）

> browser-agent 当前只完成了 Step 5a，**5b/5c/5d/5e 都没做**。后果：
>
> - `sync-templates` 不会同步它 → npm 包里缺这个模板
> - `prepublishOnly` 不校验它 → 可能发布残缺版本
> - `detectTemplateMeta` 把它误判为 general → `update --force` 会用 general 覆盖 browser-agent 项目（数据破坏！）
> - `templates.test.ts` 断言 `toHaveLength(3)` → 测试已失败
> - `pi-cli/templates/browser-agent/` 是手动放的、未 git 跟踪

**教训：Step 5 的 5 处必须一次性全改，缺一不可。** 把下面这个检查清单贴出来用：

```
[ ] 5a templates.ts     — TEMPLATES 数组加了条目
[ ] 5b package.json     — sync-templates 加了 rm+rsync+eslint-plugin 复制；prepublishOnly 加了校验
[ ] 5c post-sync.mjs    — templateNames 数组加了
[ ] 5d update.ts        — detectTemplateMeta 加了识别分支
[ ] 5e templates.test.ts — toHaveLength +1，加了 includes/info/resolve 用例
```

---

## 双模式架构说明（Desktop + Web）

每个模板都支持两种运行模式，这是 pi-agent 的核心特性：

| 模式        | 入口               | 传输层         | 启动命令          |
| ----------- | ------------------ | -------------- | ----------------- |
| Web（开发） | `src/server.ts`    | WebSocket      | `bun run dev:web` |
| Desktop     | `src/bun/index.ts` | Electrobun IPC | `bun run dev`     |

**端口协商机制（三层）：**

1. **配置默认值** — `server-config.ts` 的 PORT
2. **自动递增** — `web-server.ts` 的 `findAvailablePort`（从默认值起，占用就 +1，最多 10 次）
3. **进程间协作** — `.server-port` 文件（dev↔Vite）+ `~/.pi-agent/ports.json`（多实例追踪）

**混合模式（可选）：** 设 `ENABLE_WEB_SERVICE=true`，桌面进程内额外起 HTTP+WS 服务，实现 Desktop+Web 同时访问。browser-agent 用到了这个特性。

---

## 参考文件

- `references/template-checklist.md` — 完整的新模板交付检查清单（打印用）
- 上游 skills：
  - `pi-rpc-module-dev` — 模块内部开发规范（加 RPC 功能时用）
  - `pi-template-dev` — 模板前端规范（主题/i18n/组件/Store）
  - `pi-fullstack-debug` — 调试排查
