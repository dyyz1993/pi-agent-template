---
globs: "**/*.ts, **/*.tsx"
keywords: typescript, type, interface, generic
match: any
---

# TypeScript 规范

- 禁止 `any`，用 `unknown` 并收窄
- 公共 API 必须有显式返回类型
- 使用 `import type` 导入纯类型
- 组件文件 PascalCase，工具文件 camelCase
- 优先用 `interface` 定义对象形状，`type` 用于联合/交叉/工具类型
- 禁止 `@ts-ignore`，用 `@ts-expect-error` 并注释原因
