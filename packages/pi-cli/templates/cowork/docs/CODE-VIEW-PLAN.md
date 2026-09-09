# Cowork Code View — 内嵌浏览器能力规划文档

> **用途**：切换到 Code 模式时，用户可以打开 localhost（或任意 URL），在内嵌浏览器中查看页面。
> 平台差异：桌面端用 Electrobun BrowserView（原生 webview），Web 端用 iframe。
> 本文档供后续模型执行参考，按此方案实施。

---

## 一、需求概述

### 用户故事

```
用户在 Cowork 模板中开发前端项目（如 Vite dev server 跑在 localhost:5173）
  → 切换到 Code Tab
  → 输入 localhost:5173（或从历史记录选）
  → 看到内嵌的页面预览
  → 可以在预览中导航（前进/后退/刷新/改 URL）
  → 桌面端：原生 webview 窗口；Web 端：iframe 预览
```

### 平台差异矩阵

| 能力             | 桌面端（Electrobun）                     | Web 端（浏览器）                                                   |
| ---------------- | ---------------------------------------- | ------------------------------------------------------------------ |
| **渲染方式**     | `BrowserView`（原生 webview，沙箱）      | `<iframe>`                                                         |
| **可加载的 URL** | 任意（含 localhost / https / file://）   | 受浏览器同源策略限制（localhost OK，公网看目标站 X-Frame-Options） |
| **JS 注入**      | 支持（`executeJavascript`）              | 不支持（跨域）                                                     |
| **导航事件**     | 原生事件（`did-navigate` / `dom-ready`） | iframe `onLoad`（跨域无法读 URL）                                  |
| **多标签**       | 创建多个 BrowserView                     | 多个 iframe（内存开销大，建议限制 3 个）                           |
| **DevTools**     | 可开启原生 DevTools                      | 无（用户可右键 Inspect）                                           |

---

## 二、技术架构

### 整体数据流

```
用户在 CodeView 输入 URL
  ↓
前端调 apiClient.call("preview.open", { url })
  ↓ RPC
后端 preview handler：
  ├─ 桌面端 → 创建/复用 BrowserView，loadURL(url)
  ├─ Web 端 → 返回 { ok, useIframe: true }，前端自己渲染 iframe
  ↓
后端 emitEvent("preview.navState", { url, state: "loading"|"ready"|"error", title })
  ↓ SSE/IPC
前端 subscribe("preview.navState") → 更新地址栏 + 加载指示器
```

### 模块组合更新

```
cowork = system + chat + file + timer + task + context + output + preview(新)
         ─────── 通用模块 ─────────  Cowork 专属 ───────────  新增
```

CLI 识别签名更新为：`task` + `context` + `output` + `preview` 四模块共存

---

## 三、新增 RPC 模块设计

### 3.1 `modules/preview.ts` — 类型定义

```typescript
/**
 * Preview 模块 — 内嵌浏览器预览
 *
 * 桌面端用 Electrobun BrowserView，Web 端用 iframe。
 * 后端负责桌面端的窗口管理 + URL 加载；Web 端只返回"用 iframe 渲染"的信号。
 */

export type NavState = 'loading' | 'ready' | 'error';

export interface PreviewTab {
	id: string;
	url: string;
	title: string;
	state: NavState;
	canGoBack: boolean;
	canGoForward: boolean;
}

export interface PreviewMethods {
	/** 打开 URL（桌面端创建 BrowserView，Web 端返回 iframe 信号） */
	'preview.open': {
		params: { url: string; tabId?: string };
		result: { tab: PreviewTab; useIframe: boolean };
	};

	/** 导航控制 */
	'preview.navigate': {
		params: { tabId: string; action: 'back' | 'forward' | 'reload' };
		result: { ok: boolean };
	};

	/** 关闭预览标签 */
	'preview.close': {
		params: { tabId: string };
		result: { ok: boolean };
	};

	/** 获取当前所有预览标签 */
	'preview.list': {
		params: Record<string, never>;
		result: { tabs: PreviewTab[] };
	};

	/** 获取最近打开的 URL 历史 */
	'preview.history': {
		params: Record<string, never>;
		result: { urls: string[] };
	};
}

export interface PreviewEvents {
	/** 导航状态变化（加载中/就绪/出错） */
	'preview.navState': PreviewTab;
}
```

### 3.2 `handlers/preview.ts` — Handler 实现（分平台）

```typescript
import type { RPCServer } from '@dyyz1993/rpc-core';
import type { HandlerOptions, RPCMethods } from '../rpc-schema';
import type { PreviewTab, NavState } from '../modules/preview';

// 内存存储
const tabs = new Map<string, PreviewTab>();
const history: string[] = [];

export function register(server: RPCServer, options: HandlerOptions): void {
	const isDesktop = options.platform === 'desktop';

	// ── preview.open ──
	// 桌面端：调 Electrobun BrowserView API 加载 URL
	// Web 端：返回 useIframe=true，前端自己渲染 iframe
	server.register('preview.open', async (params) => {
		const tabId = params.tabId || `preview-${Date.now().toString(36)}`;
		const tab: PreviewTab = {
			id: tabId,
			url: params.url,
			title: params.url,
			state: 'loading' as NavState,
			canGoBack: false,
			canGoForward: false,
		};

		tabs.set(tabId, tab);

		// 记录历史（去重，最多 20 条）
		if (!history.includes(params.url)) {
			history.unshift(params.url);
			if (history.length > 20) history.pop();
		}

		if (isDesktop) {
			// TODO（桌面端实现）：创建或复用 BrowserView
			// const { BrowserView } = await import("electrobun/bun");
			// const view = new BrowserView({ url: params.url, sandbox: true });
			// view.on("dom-ready", () => emitNavState(tabId, "ready"));
			// view.on("did-navigate", (e) => updateUrl(tabId, e.url));
			// 暂时标记 ready（MVP 用 iframe 兜底）
			tab.state = 'ready';
		} else {
			// Web 端：前端用 iframe 渲染
			tab.state = 'ready';
		}

		server.emitEvent('preview.navState', tab);
		return { tab, useIframe: !isDesktop };
	});

	// ── preview.navigate ──
	server.register('preview.navigate', async (params) => {
		const tab = tabs.get(params.tabId);
		if (!tab) throw new Error(`Tab not found: ${params.tabId}`);

		// TODO（桌面端）：view.goForward() / view.goBack() / view.reload()
		// MVP：重新标记为 loading
		tab.state = 'loading';
		server.emitEvent('preview.navState', tab);

		// 模拟加载完成
		setTimeout(() => {
			tab.state = 'ready';
			server.emitEvent('preview.navState', tab);
		}, 500);

		return { ok: true };
	});

	// ── preview.close ──
	server.register('preview.close', async (params) => {
		// TODO（桌面端）：view.close()
		tabs.delete(params.tabId);
		return { ok: true };
	});

	// ── preview.list ──
	server.register('preview.list', async () => ({
		tabs: [...tabs.values()],
	}));

	// ── preview.history ──
	server.register('preview.history', async () => ({
		urls: history,
	}));
}
```

> **注意**：桌面端的 BrowserView 实现需要 `import("electrobun/bun")`，这只能在 bun 运行时（非浏览器）执行。MVP 阶段先用 iframe 兜底（`useIframe: true`），后续再接原生 webview。

### 3.3 rpc-schema.ts 更新

```typescript
// rpc-schema.ts 新增 PreviewMethods 和 PreviewEvents
import type { PreviewMethods, PreviewEvents } from './modules/preview';

export interface RPCMethods
	extends
		AnyMethods,
		SystemMethods,
		FileMethods,
		TimerMethods,
		ChatMethods,
		TaskMethods,
		ContextMethods,
		OutputMethods,
		PreviewMethods {} // ← 新增

export interface RPCEvents extends TimerEvents, ChatEvents, PreviewEvents {} // ← 新增
```

### 3.4 handlers/index.ts 更新

```typescript
export { register as task } from './task';
export { register as context } from './context';
export { register as output } from './output';
export { register as preview } from './preview'; // ← 新增
```

---

## 四、前端 UI 组件设计

### 4.1 CodeView 组件（替换当前的占位）

```
templates/cowork/src/mainview/components/code/
├── CodeView.tsx          # 主组件：地址栏 + 预览区
├── AddressBar.tsx        # URL 输入 + 前进/后退/刷新
├── PreviewFrame.tsx      # 渲染层（桌面 webview 容器 / Web iframe）
└── PreviewTabs.tsx       # 多标签栏（可选，MVP 单标签）
```

#### CodeView.tsx

```typescript
/**
 * Code 视图 — 内嵌浏览器预览
 *
 * 用户输入 URL → 调 preview.open → 渲染 iframe（Web）或 webview 容器（桌面）
 */
import { useState, useEffect } from "react";
import { AddressBar } from "./AddressBar";
import { PreviewFrame } from "./PreviewFrame";
import { usePreviewStore } from "../../stores/use-preview-store";

export function CodeView() {
  const [url, setUrl] = useState("");
  const { currentTab, useIframe, openUrl, navState } = usePreviewStore();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 地址栏 */}
      <AddressBar
        url={url}
        onChange={setUrl}
        onSubmit={() => openUrl(url)}
        navState={navState}
      />

      {/* 预览区 */}
      <div className="flex-1 overflow-hidden bg-white">
        {currentTab ? (
          <PreviewFrame tab={currentTab} useIframe={useIframe} />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}
```

#### AddressBar.tsx

```typescript
/**
 * 地址栏 — URL 输入 + 导航按钮 + 加载指示器
 *
 * 样式参考浏览器地址栏：
 * [← → ⟳] [https://localhost:5173          ] [⋯]
 */
import { ArrowLeft, ArrowRight, RotateCw, Loader2 } from "lucide-react";
import type { NavState } from "../../stores/use-preview-store";

interface AddressBarProps {
  url: string;
  onChange: (url: string) => void;
  onSubmit: () => void;
  navState: NavState;
}

export function AddressBar({ url, onChange, onSubmit, navState }: AddressBarProps) {
  return (
    <div className="h-11 flex items-center gap-2 px-3 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]">
      {/* 后退 */}
      <button className="p-1.5 rounded-lg hover:bg-[var(--color-bg-hover)] disabled:opacity-30 transition-colors">
        <ArrowLeft className="w-4 h-4" />
      </button>
      {/* 前进 */}
      <button className="p-1.5 rounded-lg hover:bg-[var(--color-bg-hover)] disabled:opacity-30 transition-colors">
        <ArrowRight className="w-4 h-4" />
      </button>
      {/* 刷新 */}
      <button className="p-1.5 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors">
        {navState === "loading" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <RotateCw className="w-4 h-4" />
        )}
      </button>

      {/* URL 输入框 */}
      <input
        value={url}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        placeholder="输入 URL，如 localhost:5173"
        className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-sm focus:border-[var(--color-text-accent)] outline-none transition-colors"
      />
    </div>
  );
}
```

#### PreviewFrame.tsx

```typescript
/**
 * 预览渲染层 — 根据平台选择 iframe 或 webview 容器
 *
 * Web 端：直接渲染 <iframe>
 * 桌面端：渲染一个占位容器，后端创建 BrowserView 叠在上面
 */
import type { PreviewTab } from "../../stores/use-preview-store";

interface PreviewFrameProps {
  tab: PreviewTab;
  useIframe: boolean;
}

export function PreviewFrame({ tab, useIframe }: PreviewFrameProps) {
  if (useIframe) {
    // Web 端：iframe 渲染
    return (
      <iframe
        src={tab.url}
        className="w-full h-full border-0"
        title="Preview"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    );
  }

  // 桌面端：webview 容器（后端创建 BrowserView 叠加在此区域）
  // MVP 阶段桌面端也用 iframe 兜底
  return (
    <div className="w-full h-full flex items-center justify-center text-[var(--color-text-tertiary)]">
      <div className="text-center">
        <RotateCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
        <p className="text-sm">加载中：{tab.url}</p>
        <p className="text-xs mt-1">桌面端将使用原生 webview</p>
      </div>
    </div>
  );
}
```

### 4.2 use-preview-store.ts

```typescript
/**
 * Preview Store — 内嵌浏览器状态管理
 */
import { create } from 'zustand';
import { apiClient } from '../lib/api-client';

export type NavState = 'idle' | 'loading' | 'ready' | 'error';

export interface PreviewTab {
	id: string;
	url: string;
	title: string;
	state: NavState;
}

interface PreviewState {
	currentTab: PreviewTab | null;
	useIframe: boolean;
	navState: NavState;
	history: string[];
	openUrl: (url: string) => Promise<void>;
	navigate: (action: 'back' | 'forward' | 'reload') => Promise<void>;
	loadHistory: () => Promise<void>;
}

export const usePreviewStore = create<PreviewState>((set, get) => ({
	currentTab: null,
	useIframe: true,
	navState: 'idle',
	history: [],

	openUrl: async (url) => {
		// 确保 URL 有协议前缀
		const fullUrl = url.startsWith('http') ? url : `http://${url}`;
		set({ navState: 'loading' });

		try {
			const res = await apiClient.call('preview.open', { url: fullUrl });
			set({
				currentTab: res.tab,
				useIframe: res.useIframe,
				navState: res.tab.state,
			});
		} catch (err) {
			set({ navState: 'error' });
			console.error('Failed to open URL:', err);
		}

		// 订阅导航状态事件
		apiClient.subscribe(
			'preview.navState',
			(tab) => {
				if (tab.id === get().currentTab?.id) {
					set({ currentTab: tab, navState: tab.state });
				}
			},
			{},
		);
	},

	navigate: async (action) => {
		const tab = get().currentTab;
		if (!tab) return;
		set({ navState: 'loading' });
		try {
			await apiClient.call('preview.navigate', { tabId: tab.id, action });
		} catch {
			set({ navState: 'error' });
		}
	},

	loadHistory: async () => {
		try {
			const res = await apiClient.call('preview.history', {});
			set({ history: res.urls });
		} catch {
			/* ignore */
		}
	},
}));
```

---

## 五、AppLayout 集成

```typescript
// AppLayout.tsx 修改 CodeView 引用
import { CodeView } from "../code/CodeView";

// 中间内容区渲染逻辑
<div className="flex-1 flex flex-col overflow-hidden min-w-0">
  {centerTab === "chat" && <ChatView />}
  {centerTab === "code" && <CodeView />}
  {centerTab === "cowork" && <TaskChat />}
</div>
```

---

## 六、桌面端原生 Webview（Phase 2，可选）

> MVP 阶段桌面端也用 iframe（简单可靠）。以下为后续升级到原生 webview 的方案。

### 6.1 桌面端 handler 扩展

```typescript
// handlers/preview.ts 桌面端分支（Phase 2）
if (isDesktop) {
	const { BrowserView } = await import('electrobun/bun');

	// 创建独立 BrowserView（非主窗口的 webview）
	const view = new BrowserView({
		url: params.url,
		sandbox: true, // 沙箱模式，安全加载远程 URL
		navigationRules: [
			{
				pattern: 'http://localhost:*', // 白名单
				action: 'allow',
			},
		],
	});

	// 监听导航事件
	view.on('dom-ready', () => {
		tab.state = 'ready';
		server.emitEvent('preview.navState', tab);
	});

	view.on('did-navigate', (e: { url: string }) => {
		tab.url = e.url;
		server.emitEvent('preview.navState', tab);
	});

	// 存储 view 引用（供 navigate/close 操作）
	browserViews.set(tabId, view);
}
```

### 6.2 前端 webview 容器

桌面端时，前端渲染一个**透明占位 div**，后端通过 Electrobun 的 BrowserView 叠加机制将原生 webview 定位到该区域上方。需要用 `resizeObserver` 同步窗口尺寸。

---

## 七、实施清单

### Phase 1：MVP（iframe 兜底，两个平台统一）

```
后端（3 个文件）：
[ ] modules/preview.ts        — 类型定义（PreviewMethods + PreviewEvents）
[ ] handlers/preview.ts       — handler（内存存储 + 假的 BrowserView 调用）
[ ] rpc-schema.ts             — 加 PreviewMethods/PreviewEvents 到 extends 链
[ ] handlers/index.ts         — 加 export { register as preview }

前端（4 个文件）：
[ ] stores/use-preview-store.ts   — 预览状态管理
[ ] components/code/CodeView.tsx   — 主组件
[ ] components/code/AddressBar.tsx — 地址栏
[ ] components/code/PreviewFrame.tsx — 渲染层（iframe）

集成（2 个文件）：
[ ] AppLayout.tsx              — CodeView 替换占位
[ ] components/sidebar/TaskSidebar.tsx — Code Tab 的左栏加 URL 历史

CLI 注册更新（1 个文件）：
[ ] packages/pi-cli/src/commands/update.ts — detectTemplateMeta 加 preview 识别
```

### Phase 2：桌面端原生 Webview（可选，后续）

```
[ ] handlers/preview.ts — 桌面端分支接 BrowserView API
[ ] PreviewFrame.tsx — 桌面端渲染透明容器 + resize 同步
[ ] 桌面端 webview 的导航规则白名单配置
```

### 测试

```
[ ] handlers/__tests__/preview-handler.test.ts — createMockServer 模式测试
[ ] stores/__tests__/use-preview-store.test.ts — store 测试
[ ] 手动：输入 localhost:5173 能看到 iframe 渲染
```

---

## 八、安全注意事项

1. **iframe sandbox**：必须设 `sandbox="allow-scripts allow-same-origin allow-forms allow-popups"`，不要加 `allow-top-navigation`
2. **桌面端 BrowserView**：必须用 `sandbox: true` + `navigationRules` 白名单，禁止加载非白名单 URL
3. **URL 校验**：前端输入 URL 时校验协议（只允许 http/https，禁止 file:// / javascript:）
4. **CORS**：preview handler 不代理请求，只返回 URL 让前端自己渲染 iframe，避免 SSRF
5. **混合内容**：如果 cowork 本身是 HTTPS 部署，嵌入 HTTP 的 localhost 会被浏览器阻止。开发场景通常都是 HTTP，没问题

---

## 九、交互流程图

```
┌──────────────────────────────────────────────┐
│ Code Tab                                      │
│ ┌──────────────────────────────────────────┐ │
│ │ [←][→][⟳] [localhost:5173           ] [⋯]│ │ ← AddressBar
│ ├──────────────────────────────────────────┤ │
│ │                                          │ │
│ │         iframe / webview 渲染区           │ │ ← PreviewFrame
│ │                                          │ │
│ │         (localhost:5173 的页面)           │ │
│ │                                          │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘

事件流：
  preview.open → loading → emitEvent(navState) → ready
                                              ↓
                                    AddressBar 停止 spinner
```

---

## 十、文件清单总览

| 类型    | 文件路径                                        | 说明                           |
| ------- | ----------------------------------------------- | ------------------------------ |
| 类型    | `src/shared/modules/preview.ts`                 | PreviewMethods + PreviewEvents |
| Handler | `src/shared/handlers/preview.ts`                | 内存存储 + 平台分支            |
| Schema  | `src/shared/rpc-schema.ts`                      | 加 PreviewMethods/Events       |
| Barrel  | `src/shared/handlers/index.ts`                  | 加 preview export              |
| Store   | `src/mainview/stores/use-preview-store.ts`      | 预览状态管理                   |
| UI      | `src/mainview/components/code/CodeView.tsx`     | 主组件                         |
| UI      | `src/mainview/components/code/AddressBar.tsx`   | 地址栏                         |
| UI      | `src/mainview/components/code/PreviewFrame.tsx` | 渲染层                         |
| 集成    | `src/mainview/components/layout/AppLayout.tsx`  | CodeView 替换占位              |
| CLI     | `packages/pi-cli/src/commands/update.ts`        | 加 preview 识别                |

**所有路径相对于 `templates/cowork/`（除 CLI 文件）**
