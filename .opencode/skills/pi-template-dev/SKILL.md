---
name: pi-template-dev
version: "1.0.0"
description: >
  Pi Agent 模板的开发和维护规范。涵盖主题系统（CSS 变量）、i18n 国际化、组件开发、
  Zustand Store 管理、测试编写等完整规范。
  当用户需要修改模板 UI、添加新组件、修改样式、添加新语言、创建新 Store、
  或维护现有模板功能时，使用此 Skill。
  当用户提到"组件"、"样式"、"主题"、"语言"、"Store"、"模板"时触发。
---

# Pi Agent Template — 开发规范 Skill

## 1. 模板架构概览

项目包含 3 种模板类型，位于 `templates/` 目录：

| 模板      | 定位                        | 适用场景                    |
| --------- | --------------------------- | --------------------------- |
| `agent`   | 编码 Agent 模板（功能最全） | AI Coding Agent、自动化工具 |
| `chat`    | 对话型模板                  | AI Chatbot、对话式交互应用  |
| `general` | 全功能模板                  | 通用桌面应用开发            |

### 技术栈

- **Runtime**: Electrobun + Bun
- **Frontend**: React + TailwindCSS + Vite
- **State**: Zustand（无 Props Drilling）
- **Communication**: `@dyyz1993/rpc-core` (IPC / WebSocket / SSE)
- **i18n**: react-i18next
- **Test**: Vitest + Playwright E2E

### 前端目录结构（以 agent 为例）

```
templates/agent/src/mainview/
├── index.css                    ← CSS 变量定义（:root + .dark）
├── App.tsx                      ← 入口：AppLayout + useRpcInit
├── components/
│   ├── layout/                  ← AppLayout（布局容器）
│   ├── activity-bar/            ← 活动栏
│   ├── sidebar/                 ← 侧边栏容器
│   ├── chat/                    ← 聊天面板（ChatPanel + MessageBubble）
│   ├── explorer/                ← 文件浏览器（ExplorerSidebar + TreeNodeItem + ...）
│   ├── git/                     ← Git 面板
│   ├── feed/                    ← Feed + Subscriptions
│   ├── bash/                    ← 终端面板
│   ├── todo/                    ← Todo 面板
│   ├── rules/                   ← Rules 面板
│   ├── diff/                    ← Diff 查看器
│   ├── search/                  ← 搜索面板
│   ├── debug/                   ← Debug 面板
│   ├── file-preview/            ← 文件预览
│   └── common/                  ← 通用组件（ConfirmDialog, ContextMenu, InlineInput）
├── stores/
│   ├── use-app-store.ts         ← 全局 UI 状态
│   ├── use-chat-store.ts        ← 聊天消息
│   ├── use-connection-store.ts  ← 连接状态、模式（web/desktop）、重试
│   ├── use-explorer-store.ts    ← 文件浏览器
│   ├── use-git-store.ts         ← Git 状态
│   ├── use-bash-store.ts        ← 终端
│   ├── use-feed-store.ts        ← Feed
│   ├── use-todo-store.ts        ← Todo
│   ├── use-rules-store.ts       ← Rules
│   ├── use-log-store.ts         ← 日志
│   ├── use-sidebar-store.ts     ← 侧边栏
│   ├── use-notification-store.ts← 通知
│   ├── use-theme-store.ts       ← 主题（dark/light）
│   ├── use-locale-store.ts      ← 语言切换
│   └── message-batcher.ts       ← 消息批处理工具
├── lib/
│   ├── api-client.ts            ← RPC Client 封装
│   └── i18n/
│       ├── index.ts             ← i18n 配置
│       └── locales/
│           ├── en.json          ← 英文翻译
│           └── zh.json          ← 中文翻译
└── types.ts                     ← 共享类型定义
```

---

## 2. 主题开发规范

### 2.1 核心原则

1. **使用 CSS 变量** — 所有颜色必须通过 `var(--color-xxx)` 引用
2. **禁止硬编码颜色值** — 不要使用 `bg-gray-900` 等固定颜色 class
3. **深色优先** — 默认主题为 dark，light 为可选切换

### 2.2 完整 CSS 变量列表（22 个）

| 类别 | 变量名                     | Light 值          | Dark 值           |
| ---- | -------------------------- | ----------------- | ----------------- |
| 背景 | `--color-bg-primary`       | `#ffffff`         | `#111827`         |
| 背景 | `--color-bg-secondary`     | `#f3f4f6`         | `#1f2937`         |
| 背景 | `--color-bg-tertiary`      | `#e5e7eb`         | `#374151`         |
| 背景 | `--color-bg-input`         | `#f9fafb`         | `#374151`         |
| 背景 | `--color-bg-hover`         | `#e5e7eb`         | `#4b5563`         |
| 背景 | `--color-bg-active`        | `#d1d5db`         | `#6b7280`         |
| 背景 | `--color-bg-sidebar`       | `#f3f4f6`         | `#1f2937`         |
| 背景 | `--color-bg-overlay`       | `rgba(0,0,0,0.5)` | `rgba(0,0,0,0.7)` |
| 文字 | `--color-text-primary`     | `#111827`         | `#ffffff`         |
| 文字 | `--color-text-secondary`   | `#4b5563`         | `#d1d5db`         |
| 文字 | `--color-text-tertiary`    | `#9ca3af`         | `#6b7280`         |
| 文字 | `--color-text-placeholder` | `#6b7280`         | `#9ca3af`         |
| 文字 | `--color-text-accent`      | `#4f46e5`         | `#818cf8`         |
| 文字 | `--color-text-success`     | `#16a34a`         | `#4ade80`         |
| 文字 | `--color-text-error`       | `#dc2626`         | `#f87171`         |
| 文字 | `--color-text-info`        | `#0891b2`         | `#22d3ee`         |
| 边框 | `--color-border-primary`   | `#d1d5db`         | `#374151`         |
| 边框 | `--color-border-secondary` | `#e5e7eb`         | `#4b5563`         |
| 强调 | `--color-accent`           | `#4f46e5`         | `#6366f1`         |
| 强调 | `--color-accent-hover`     | `#4338ca`         | `#4f46e5`         |
| 徽章 | `--color-badge-bg`         | `#e0e7ff`         | `#312e81`         |
| 徽章 | `--color-badge-text`       | `#3730a3`         | `#a5b4fc`         |

### 2.3 使用方式

CSS 中：

```css
.my-element {
	background-color: var(--color-bg-primary);
	color: var(--color-text-primary);
	border: 1px solid var(--color-border-primary);
}
```

Tailwind 中：

```html
<div className="bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"></div>
```

### 2.4 主题切换

```typescript
import { useThemeStore } from "../../stores/use-theme-store";
const theme = useThemeStore((s) => s.theme);
const toggleTheme = useThemeStore((s) => s.toggleTheme);
const setTheme = useThemeStore((s) => s.setTheme);
```

### 2.5 添加新颜色步骤

1. 在 `index.css` 的 `:root` 和 `.dark` 中**都**添加变量
2. 确保两个主题下变量名一致
3. 在组件中使用 `var(--color-xxx)` 引用
4. 测试两种主题下的视觉效果

### 2.6 禁止事项

- 禁止使用 `bg-gray-900` 等硬编码 Tailwind 颜色
- 禁止只在 `:root` 添加变量而忘记 `.dark`
- 禁止在 CSS/JS 中直接写 hex/rgb 值作为颜色

---

## 3. i18n 开发规范

### 3.1 核心原则

1. **禁止硬编码 UI 文本** — 所有面向用户的文本必须通过 `t()` 获取
2. **翻译文件是唯一真相源** — 所有文本定义在 `lib/i18n/locales/{locale}.json`
3. **命名空间使用点分隔** — `模块.功能.具体文本`

### 3.2 Key 命名规范

| 模块       | Key 格式       | 示例                              |
| ---------- | -------------- | --------------------------------- |
| 全局       | `common.xxx`   | `common.loading`, `common.cancel` |
| 应用       | `app.xxx`      | `app.title`, `app.connecting`     |
| 侧边栏     | `sidebar.xxx`  | `sidebar.explorer`                |
| 标签页     | `tabs.xxx`     | `tabs.chat`                       |
| 聊天       | `chat.xxx`     | `chat.placeholder`                |
| 资源管理器 | `explorer.xxx` | `explorer.newFile`                |
| Git        | `git.xxx`      | `git.staged`                      |
| Feed       | `feed.xxx`     | `feed.newPost`                    |
| Todo       | `todo.xxx`     | `todo.add`                        |
| 规则       | `rules.xxx`    | `rules.pattern`                   |
| 主题       | `theme.xxx`    | `theme.light`                     |
| 语言       | `locale.xxx`   | `locale.en`                       |
| Bash       | `bash.xxx`     | `bash.run`                        |
| Diff       | `diff.xxx`     | `diff.lineByLine`                 |
| Debug      | `debug.xxx`    | `debug.rpcCalls`                  |

### 3.3 组件中使用

```typescript
import { useTranslation } from "react-i18next";

function MyComponent() {
  const { t } = useTranslation();
  return <h1>{t("chat.title")}</h1>;
}
```

### 3.4 非组件中使用

```typescript
import i18n from "../lib/i18n";
const message = i18n.t("common.loading");
```

### 3.5 添加新 key 的步骤

1. 在 `en.json` 对应模块下添加新 key
2. **同步**在 `zh.json` 添加对应翻译
3. 在组件中使用 `t("模块.key")` 引用
4. 运行确认无 fallback 警告

### 3.6 添加新语言的步骤

1. 在 `lib/i18n/locales/` 创建新语言文件（如 `ja.json`）
2. 复制 `en.json` 的完整结构，翻译所有 value
3. 在 `lib/i18n/index.ts` 的 `supportedLocales` 和 `resources` 中添加
4. 在 `use-locale-store.ts` 的类型中添加
5. 在 `LanguageSwitcher` 组件中添加选项

### 3.7 禁止事项

- 禁止在翻译 key 中使用变量拼接：`t(\`${module}.title\`)`
- 禁止新增 key 只加 `en.json` 忘记 `zh.json`

---

## 4. 组件开发规范

### 4.1 组件文件结构

每个功能模块一个目录，包含组件和测试：

```
components/chat/
├── ChatPanel.tsx          ← 主面板组件
├── MessageBubble.tsx      ← 子组件
└── __tests__/
    └── ChatPanel.test.tsx
```

### 4.2 memo / useMemo / useCallback 使用时机

| 场景                     | 用什么          | 条件            |
| ------------------------ | --------------- | --------------- |
| 纯展示组件，props 不常变 | `React.memo()`  | 列表项、气泡等  |
| 计算量较大的派生值       | `useMemo()`     | 过滤/排序大数组 |
| 传递给子组件的回调       | `useCallback()` | 事件处理器      |
| 简单状态/频繁变化        | 不优化          | 避免 memo 滥用  |

### 4.3 虚拟化列表

当列表项可能超过 100 条时，使用 `@tanstack/react-virtual`：

```typescript
import { useVirtualizer } from "@tanstack/react-virtual";

const virtualizer = useVirtualizer({
	count: items.length,
	getScrollElement: () => parentRef.current,
	estimateSize: () => 40,
});
```

### 4.4 懒加载

非首屏面板使用 `Suspense + React.lazy`：

```typescript
const DebugPanel = React.lazy(() => import("../debug/DebugPanel"));

<Suspense fallback={<LoadingSpinner />}>
  <DebugPanel />
</Suspense>
```

### 4.5 通用组件复用

`components/common/` 下已有可复用组件：

| 组件            | 用途                     |
| --------------- | ------------------------ |
| `ConfirmDialog` | 确认对话框（删除等操作） |
| `ContextMenu`   | 右键菜单                 |
| `InlineInput`   | 行内编辑输入框           |

新功能优先使用这些通用组件，避免重复实现。

---

## 5. Store 开发规范

### 5.1 Zustand Store 结构

```typescript
import { create } from "zustand";

interface XxxState {
	// 数据字段
	items: Item[];
	loading: boolean;
	// Action 方法
	setItems: (items: Item[]) => void;
	addItem: (item: Item) => void;
	fetchItems: () => Promise<void>;
}

export const useXxxStore = create<XxxState>((set, get) => ({
	items: [],
	loading: false,

	setItems: (items) => set({ items }),
	addItem: (item) => set((s) => ({ items: [...s.items, item] })),
	fetchItems: async () => {
		set({ loading: true });
		try {
			const result = await apiClient.call("module.list", {});
			set({ items: result.items });
		} catch (err) {
			useLogStore.getState().addLog(`Error: ${err instanceof Error ? err.message : String(err)}`);
		} finally {
			set({ loading: false });
		}
	},
}));
```

### 5.2 规则

- **无 Props Drilling**：组件直接从 store 读取数据，不通过 Props 传递
- **RPC 调用**：所有 RPC 调用通过 `apiClient.call()` / `apiClient.subscribe()`
- **错误日志**：catch 中通过 `useLogStore.getState().addLog()` 记录错误
- **数据截断**：订阅事件的数据数组使用 `.slice(-N)` 保持上限，如 `tickEvents: [...s.tickEvents.slice(-19), newItem]`
- **Store 间调用**：通过 `useXxxStore.getState().method()` 调用其他 store 方法（不使用 hook）

### 5.3 useShallow selector

当组件需要从 store 选取多个值时使用 `useShallow` 避免不必要的重渲染：

```typescript
import { useShallow } from "zustand/react/shallow";

const { items, loading } = useXxxStore(useShallow((s) => ({ items: s.items, loading: s.loading })));
```

### 5.4 测试 Store

使用 `vi.mock` mock 掉 `apiClient` 和 `useLogStore`，通过动态 import 获取 store：

```typescript
vi.mock("../../lib/api-client", () => ({
	apiClient: {
		call: vi.fn().mockResolvedValue({
			/* mock data */
		}),
		subscribe: vi.fn().mockResolvedValue("sub-id"),
		unsubscribe: vi.fn(),
	},
}));

it("should work", async () => {
	const { useXxxStore } = await import("../use-xxx-store");
	const state = useXxxStore.getState();
	expect(state.items).toEqual([]);
});
```

---

## 6. 测试规范

### 6.1 TDD 工作流

1. **Red** — 先写失败测试
2. **Green** — 写最小实现代码使测试通过
3. **Refactor** — 重构优化

### 6.2 测试命令

```bash
cd templates/<template> && npx vitest run        # 模板单元测试
cd packages/rpc-core && bun test tests/          # RPC 核心测试
npx playwright test                               # E2E 测试
```

### 6.3 Store 测试模式

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/api-client", () => ({
	apiClient: {
		call: vi.fn().mockResolvedValue({ pong: true }),
		subscribe: vi.fn().mockResolvedValue("sub-id"),
		unsubscribe: vi.fn(),
	},
}));

vi.mock("./use-log-store", () => ({
	useLogStore: {
		getState: () => ({ addLog: vi.fn() }),
	},
}));

describe("useXxxStore", () => {
	beforeEach(async () => {
		vi.resetModules();
	});

	it("should have initial state", async () => {
		const { useXxxStore } = await import("../use-xxx-store");
		const state = useXxxStore.getState();
		expect(state.items).toEqual([]);
	});
});
```

### 6.4 虚拟化组件的 mock

```typescript
vi.mock("@tanstack/react-virtual", () => ({
	useVirtualizer: ({ count }: { count: number }) => ({
		getTotalSize: () => count * 40,
		getVirtualItems: () =>
			Array.from({ length: count }, (_, i) => ({
				index: i,
				start: i * 40,
				size: 40,
				key: i,
			})),
	}),
}));
```

### 6.5 Mock WebSocket

```typescript
class MockWebSocket {
	static CONNECTING = 0;
	static OPEN = 1;
	static CLOSING = 2;
	static CLOSED = 3;
	readyState = MockWebSocket.OPEN;
	send = vi.fn();
	close = vi.fn();
	onopen: (() => void) | null = null;
	onmessage: ((ev: { data: string }) => void) | null = null;
	onerror: ((ev: { error: Error }) => void) | null = null;
	onclose: (() => void) | null = null;

	constructor(public url: string) {
		setTimeout(() => this.onopen?.(), 0);
	}
}
```

---

## 7. 新功能检查清单

每添加一个新功能模块（如新增 "notes" 面板），需要修改以下文件：

### 7.1 RPC 层（shared/）

- [ ] `shared/modules/notes.ts` — 类型定义（interface NotesMethods, NotesEvents）
- [ ] `shared/handlers/notes.ts` — 实现（register 函数）
- [ ] `shared/handlers/index.ts` — 导出新 handler
- [ ] `shared/rpc-schema.ts` — extends chain 添加新模块
- [ ] 测试 `shared/handlers/__tests__/notes.test.ts`

### 7.2 前端 Store

- [ ] `stores/use-notes-store.ts` — Zustand store（state + actions）
- [ ] `stores/__tests__/use-notes-store.test.ts` — Store 单元测试

### 7.3 前端组件

- [ ] `components/notes/NotesPanel.tsx` — 主面板
- [ ] `components/notes/__tests__/NotesPanel.test.tsx` — 组件测试
- [ ] `components/layout/AppLayout.tsx` — 注册新面板到布局

### 7.4 i18n

- [ ] `lib/i18n/locales/en.json` — 添加 `"notes": { ... }` 模块
- [ ] `lib/i18n/locales/zh.json` — 同步添加中文翻译

### 7.5 主题（可选）

- [ ] `index.css` — 如需新颜色变量，在 `:root` 和 `.dark` 中添加

### 7.6 测试

- [ ] `vitest run` 通过
- [ ] 检查 console 无 i18n fallback 警告
- [ ] 检查 dark/light 主题显示正常

---

## 8. Commit 规范

使用 [Conventional Commits](https://www.conventionalcommits.org/)：

```
feat(notes): add notes panel with CRUD support
fix(chat): resolve message ordering issue
docs: update contributing guide
refactor(explorer): extract tree node rendering logic
test(git): add store unit tests
chore: update dependencies
```

### Pre-commit 自动检查

Husky 自动运行：

- lint-staged（ESLint on staged files）
- TypeScript type-check on core packages
