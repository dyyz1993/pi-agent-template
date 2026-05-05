---
globs: templates/*/src/mainview/**/*.{ts,tsx,css}
keywords: theme, dark, light, color, css variable
match: any
---

# 主题规范

- 所有颜色必须通过 `var(--color-xxx)` 引用，禁止硬编码
- 新增变量必须同时在 `:root` 和 `.dark` 中定义
- 变量命名：`--color-{category}-{variant}`（bg/text/border/accent）
- 默认主题 dark，light 为可选切换
- 主题切换用 `useThemeStore`，持久化到 localStorage

```css
/* ✅ */
background: var(--color-bg-primary);
/* ❌ */
background: bg-gray-900;
```
