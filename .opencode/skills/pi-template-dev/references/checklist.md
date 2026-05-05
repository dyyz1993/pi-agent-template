# 新功能检查清单

每添加一个新功能模块时，逐项检查：

## RPC 层

- [ ] `shared/modules/<name>.ts` — 类型定义
- [ ] `shared/handlers/<name>.ts` — 实现
- [ ] `shared/handlers/index.ts` — 导出
- [ ] `shared/rpc-schema.ts` — extends chain
- [ ] RPC handler 测试

## Store

- [ ] `stores/use-<name>-store.ts` — Zustand store
- [ ] `stores/__tests__/use-<name>-store.test.ts` — 测试
- [ ] mock `apiClient` + `useLogStore`

## 组件

- [ ] `components/<name>/<Name>Panel.tsx` — 主面板
- [ ] `components/<name>/__tests__/` — 组件测试
- [ ] `components/layout/AppLayout.tsx` — 注册面板

## i18n

- [ ] `en.json` — 添加 `"name": { ... }` 模块
- [ ] `zh.json` — 同步添加
- [ ] 所有 UI 文本使用 `t("name.xxx")`

## 主题

- [ ] 如需新颜色：`index.css` 的 `:root` + `.dark` 都添加
- [ ] 组件中使用 `var(--color-xxx)`
- [ ] 禁止硬编码颜色

## 验收

- [ ] `vitest run` 通过
- [ ] 无 i18n fallback 警告
- [ ] dark/light 主题正常
- [ ] ESLint 无报错
