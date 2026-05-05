---
alwaysApply: false
globs: templates/*/src/mainview/**/*.{ts,tsx}
keywords: i18n, translation, locale, language, theme, dark, light, color
---

# i18n 和主题开发规则

## i18n 规则

### 强制要求
1. 所有 UI 文本必须通过 `t()` 函数获取
2. 翻译 key 遵循 `模块.功能` 格式
3. 新增文本必须同时更新 en.json 和 zh.json
4. 禁止在 JSX 中硬编码英文字符串

### 添加新文本流程
1. 在 `lib/i18n/locales/en.json` 和 `zh.json` 中添加 key
2. 在组件中通过 `useTranslation()` 获取 `t` 函数
3. 使用 `t("xxx.yyy")` 替换硬编码文本

### 检查清单
- [ ] en.json 和 zh.json 的 key 完全一致
- [ ] 没有遗漏的硬编码字符串
- [ ] 翻译内容准确自然
- [ ] ESLint no-hardcoded-strings 规则通过

## 主题规则

### 强制要求
1. 颜色必须通过 CSS 变量引用
2. 新增颜色必须同时定义在 `:root` 和 `.dark` 中
3. 主题切换通过 `useThemeStore` 管理

### 检查清单
- [ ] 没有硬编码颜色值
- [ ] 两个主题下都有对应变量
- [ ] 切换主题后所有颜色正确
