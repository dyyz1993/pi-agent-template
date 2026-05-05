---
globs: templates/*/src/mainview/**/*.{ts,tsx}
keywords: i18n, translation, locale, language
match: any
---

# i18n 规范

- 所有 UI 文本必须通过 `t()` 获取，禁止硬编码字符串
- 翻译文件 `lib/i18n/locales/{locale}.json` 是唯一真相源
- Key 命名：`模块.功能.具体文本`（如 `chat.placeholder`）
- 新增 key 必须同时更新 en.json 和 zh.json
- 禁止在 key 中使用变量拼接

```tsx
// ✅
<h1>{t("chat.title")}</h1>
// ❌
<h1>Hello</h1>
// ❌
t(`${module}.title`)
```
