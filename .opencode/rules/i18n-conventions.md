---
globs: templates/*/src/mainview/**/*.{ts,tsx}
keywords: i18n, translation, locale, language
match: any
---

# i18n 多语言开发规范

## 核心原则

1. **禁止硬编码 UI 文本** — 所有面向用户的文本必须通过 `t()` 函数获取
2. **翻译文件是唯一真相源** — 所有文本定义在 `lib/i18n/locales/{locale}.json` 中
3. **命名空间使用点分隔** — `模块.功能.具体文本`，如 `chat.placeholder`

## 翻译文件结构

```
lib/i18n/locales/
├── en.json    # 英文（默认/fallback）
└── zh.json    # 中文
```

## Key 命名规范

| 模块 | Key 格式 | 示例 |
|------|----------|------|
| 全局 | `common.xxx` | `common.loading`, `common.cancel` |
| 应用 | `app.xxx` | `app.title`, `app.connecting` |
| 侧边栏 | `sidebar.xxx` | `sidebar.explorer` |
| 标签页 | `tabs.xxx` | `tabs.chat` |
| 聊天 | `chat.xxx` | `chat.placeholder` |
| 资源管理器 | `explorer.xxx` | `explorer.newFile` |
| Git | `git.xxx` | `git.staged` |
| Feed | `feed.xxx` | `feed.newPost` |
| Todo | `todo.xxx` | `todo.add` |
| 规则 | `rules.xxx` | `rules.pattern` |
| 主题 | `theme.xxx` | `theme.light` |
| 语言 | `locale.xxx` | `locale.en` |

## 使用方式

### 在组件中使用

```typescript
import { useTranslation } from "react-i18next";

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t("chat.title")}</h1>
      <input placeholder={t("chat.placeholder")} />
      <button>{t("chat.send")}</button>
    </div>
  );
}
```

### 在非组件中使用

```typescript
import i18n from "../lib/i18n";
const message = i18n.t("common.loading");
```

## 添加新语言的步骤

1. 在 `lib/i18n/locales/` 创建新语言文件（如 `ja.json`）
2. 复制 `en.json` 的完整结构
3. 翻译所有 value
4. 在 `lib/i18n/index.ts` 的 `supportedLocales` 和 `resources` 中添加
5. 在 `use-locale-store.ts` 的类型中添加
6. 在 `LanguageSwitcher` 组件中添加选项

## ESLint 约束

- `rpc/no-hardcoded-strings: "warn"` — 检测 JSX 中的硬编码英文字符串
- 违规示例：`<h1>Hello</h1>` → 应改为 `<h1>{t("xxx")}</h1>`

## 常见错误

**错误：** 在翻译 key 中使用变量拼接
```typescript
// ❌ 不要这样做
t(`${module}.title`)
// ✅ 应该使用完整 key
t("chat.title")
```

**错误：** 忘记在新语言文件中添加 key
```typescript
// ❌ 新增英文 key 但忘记中文
// en.json 添加了 "chat.newFeature"
// zh.json 没有添加 → 会 fallback 到英文
```
