---
globs: templates/*/src/mainview/**/*.{ts,tsx,css}
keywords: theme, dark, light, color, css variable
match: any
---

# 主题开发规范

## 核心原则

1. **使用 CSS 变量** — 所有颜色必须通过 `var(--color-xxx)` 引用
2. **禁止硬编码颜色值** — 不要使用 `bg-gray-900` 等固定颜色 class
3. **深色优先** — 默认主题为 dark，light 为可选切换

## CSS 变量系统

### 变量命名规范

```
--color-{category}-{variant}
```

| 类别 | 变量 | 用途 |
|------|------|------|
| 背景 | `--color-bg-primary` | 主背景 |
| 背景 | `--color-bg-secondary` | 次级背景/标题栏 |
| 背景 | `--color-bg-tertiary` | 嵌套容器 |
| 背景 | `--color-bg-input` | 输入框背景 |
| 背景 | `--color-bg-hover` | 悬停态 |
| 背景 | `--color-bg-active` | 激活态 |
| 背景 | `--color-bg-sidebar` | 侧边栏 |
| 文字 | `--color-text-primary` | 主文字 |
| 文字 | `--color-text-secondary` | 次要文字 |
| 文字 | `--color-text-tertiary` | 辅助文字 |
| 文字 | `--color-text-accent` | 强调文字 |
| 文字 | `--color-text-success` | 成功状态 |
| 文字 | `--color-text-error` | 错误状态 |
| 文字 | `--color-text-info` | 信息状态 |
| 边框 | `--color-border-primary` | 主边框 |
| 边框 | `--color-border-secondary` | 次级边框 |
| 强调 | `--color-accent` | 主强调色 |
| 强调 | `--color-accent-hover` | 强调悬停色 |

## 使用方式

### 在 CSS 中

```css
.my-element {
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-primary);
}
```

### 在 Tailwind 中

```html
<!-- 推荐：使用 CSS 变量 -->
<div className="bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">

<!-- 可以混用 Tailwind dark: 前缀 -->
<div className="bg-white dark:bg-gray-900">

<!-- ❌ 禁止：硬编码颜色 -->
<div className="bg-gray-900 text-white">
```

## 主题切换

```typescript
import { useThemeStore } from "../../stores/use-theme-store";

// 读取当前主题
const theme = useThemeStore((s) => s.theme);

// 切换主题
const toggleTheme = useThemeStore((s) => s.toggleTheme);

// 设置特定主题
const setTheme = useThemeStore((s) => s.setTheme);
```

## 添加新颜色的步骤

1. 在 `index.css` 的 `:root` 和 `.dark` 中都添加变量
2. 确保两个主题下变量名一致
3. 在组件中使用 `var(--color-xxx)` 引用
4. 测试两种主题下的视觉效果

## 主题 Store

- `useThemeStore` — Zustand store，管理主题状态
- 持久化到 localStorage（key: "theme"）
- 自动在 document.documentElement 上添加/移除 `dark` class
- 默认主题：dark

## 常见错误

**错误：** 只在 `:root` 中添加变量
```css
/* ❌ 缺少 .dark 定义 */
:root { --color-new: #111827; }
.dark { /* 忘记了 */ }
```

**错误：** 使用 Tailwind 固定颜色而不走 CSS 变量
```html
<!-- ❌ 无法跟随主题切换 -->
<div className="bg-gray-900">
<!-- ✅ 可以跟随主题切换 -->
<div className="bg-[var(--color-bg-primary)]">
```
