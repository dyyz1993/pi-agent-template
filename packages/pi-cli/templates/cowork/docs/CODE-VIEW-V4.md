# Cowork Code View V4 — 聊天链接触发右侧浏览器

> **核心改动**：浏览器不是手动输入 URL 打开的，而是**聊天里出现 localhost 链接，点击后右侧面板自动放大并显示浏览器**。

---

## 一、对照稿件的真实交互

```
用户在聊天中说："看一下 localhost:5173 的效果"
  ↓
AI 回复消息里包含 localhost:5173 链接（带 🌐 图标）
  ↓
用户点击这个链接
  ↓
右侧面板自动放大到 40% 宽度（从 300px 扩展到 ~560px）
  ↓
右侧面板显示浏览器预览（iframe 加载 localhost:5173）
  ↓
用户可以在右侧浏览 + 选元素
```

### 与当前实现的区别

| 维度           | 当前（V3）                            | 目标（V4）                              |
| -------------- | ------------------------------------- | --------------------------------------- |
| 怎么打开浏览器 | 手动在右栏地址栏输入 URL              | **聊天里点 localhost 链接**             |
| 右栏默认宽度   | 固定 300px                            | **点击链接后自动放大到 40%**            |
| 左栏三个 Tab   | 内容不同（Cowork=任务，Code=URL历史） | **内容一样**（都是任务列表 + New task） |
| 中间区域       | Cowork/Chat=聊天，Code=管理界面       | **永远是聊天**                          |

---

## 二、改动清单

### 2.1 聊天消息渲染 localhost 链接

在 `TaskChat.tsx` 的消息渲染中，检测文本里的 `localhost:xxxx` 或 `http://localhost`，自动渲染为可点击链接：

```tsx
// 检测 localhost URL
const LOCALHOST_REGEX = /(https?:\/\/)?localhost:\d+(\/[^\s]*)?/g;

function renderTextWithLinks(text: string, onOpenPreview: (url: string) => void) {
	// 将 localhost URL 替换为可点击的链接组件
	const parts = text.split(LOCALHOST_REGEX);
	// ... 渲染：普通文本 + <LocalhostLink> 组件
}
```

链接样式：蓝色文字 + 🌐 图标 + 下划线，hover 加深。

### 2.2 点击链接 → 右栏自动放大 + 打开浏览器

```typescript
// usePreviewStore 新增
openFromChat: (url: string) => {
	// 1. 设置 currentTab
	// 2. 通知右栏放大
	useRightPanelStore.getState().setExpandedForPreview(true);
	// 3. 加载 URL
	this.openUrl(url);
};
```

### 2.3 右栏 store 新增"预览放大"模式

```typescript
// useRightPanelStore 新增
interface RightPanelState {
	// ... 现有
	expandedForPreview: boolean; // 点击聊天链接后自动放大
	setExpandedForPreview: (v: boolean) => void;
}

// AppLayout 渲染时：
const effectiveRightWidth = expandedForPreview
	? Math.round(window.innerWidth * 0.4) // 40% 屏宽
	: rpWidth; // 用户手动设置的宽度
```

### 2.4 左栏三个 Tab 统一

去掉 TaskSidebar 里 Code Tab 显示 URL 历史的逻辑，**所有 Tab 都显示任务列表 + New task**。Tab 只影响右栏内容：

- Cowork → 右栏 = Progress + Artifacts + Context
- Code → 右栏 = Preview 浏览器（但初始空状态，等聊天链接触发）
- Chat → 右栏 = 隐藏

### 2.5 右栏 PreviewBlock 空状态优化

Code Tab 初始右栏不是地址栏输入，而是：

```
┌─────────────────┐
│ Preview         │
│                 │
│   🌐            │
│ 点击聊天中的    │
│ localhost 链接  │
│ 打开浏览器预览  │
│                 │
└─────────────────┘
```

---

## 三、文件改动

| 操作 | 文件                   | 说明                                               |
| ---- | ---------------------- | -------------------------------------------------- |
| ✏️   | `TaskChat.tsx`         | 消息文本 localhost 自动链接化 + 点击打开预览       |
| ✏️   | `use-preview-store.ts` | 新增 openFromChat 方法                             |
| ✏️   | `use-sidebar-store.ts` | useRightPanelStore 新增 expandedForPreview         |
| ✏️   | `AppLayout.tsx`        | 右栏宽度根据 expandedForPreview 自动放大           |
| ✏️   | `TaskSidebar.tsx`      | 三个 Tab 统一显示任务列表（去掉 Code 的 URL 历史） |
| ✏️   | `PreviewBlock.tsx`     | 空状态改为"点击聊天链接"提示                       |

---

## 四、交互流程图

```
┌─────────────────────────────────────────────────────────┐
│ Cowork Tab                                               │
│                                                          │
│ ┌─────┬────────────────────────┬──────────────────┐     │
│ │ 左栏 │  中间聊天               │ 右栏 (300px)      │     │
│ │ 任务 │  AI: "看一下效果 🌐     │ Progress          │     │
│ │ 列表 │  localhost:5173"       │ Artifacts         │     │
│ │      │       ↑ 点击这个链接    │ Context           │     │
│ │      │                        │                   │     │
│ └─────┴────────────────────────┴──────────────────┘     │
│                                                          │
│ 点击 localhost:5173 后 →                                 │
│                                                          │
│ ┌─────┬────────────────┬──────────────────────┐         │
│ │ 左栏 │  中间聊天       │ 右栏 (40%宽，自动放大) │         │
│ │ 任务 │               │ ┌──────────────────┐ │         │
│ │ 列表 │               │ │localhost:5173    │ │         │
│ │      │               │ ├──────────────────┤ │         │
│ │      │               │ │                  │ │         │
│ │      │               │ │  iframe 浏览器    │ │         │
│ │      │               │ │  (网页预览)       │ │         │
│ │      │               │ │                  │ │         │
│ │      │               │ └──────────────────┘ │         │
│ │      │               │ [🎯 选取元素]        │         │
│ └─────┴────────────────┴──────────────────────┘         │
└─────────────────────────────────────────────────────────┘
```
