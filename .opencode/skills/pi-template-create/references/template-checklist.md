# 新模板交付检查清单

> 打印这份清单，逐项打勾。新模板必须全部 ✅ 才算完成。

## A. 模板目录（templates/<your-template>/）

- [ ] 从现有模板复制（推荐 browser-agent）
- [ ] 清理：`rm -rf node_modules dist build .server-port logs bun.lock`
- [ ] `src/server-config.ts` — PORT 改为不冲突的端口（参考端口规划表）
- [ ] `src/server-config.ts` — corsOrigin 同步改为对应 Vite 端口
- [ ] `.env` + `.env.example` — PORT / VITE_PORT 同步修改
- [ ] `package.json` — name / description 修改
- [ ] `package.json` — 保留占位符原样（com.piagent.template 等，copy.ts 会替换）
- [ ] `src/shared/modules/` + `src/shared/handlers/` — 业务模块裁剪/添加
- [ ] `src/shared/rpc-schema.ts` — extends 链更新
- [ ] `src/shared/handlers/index.ts` — barrel export 更新
- [ ] `src/mainview/` — 前端组件/stores/hooks 按需修改
- [ ] `README.md` — RPC 模块表、环境变量表、项目结构树
- [ ] `AGENTS.md` — Agent 系统提示词

## B. 骨架文件（逐字节相同，禁止修改）

- [ ] `src/shared/lib/web-server.ts` — 未修改
- [ ] `src/shared/lib/port-registry.ts` — 未修改
- [ ] `src/shared/lib/logger.ts` — 未修改
- [ ] `src/shared/lib/path-security.ts` — 未修改
- [ ] `src/gateway/ipc-transport.ts` — 未修改
- [ ] `scripts/dev.ts` — 未修改
- [ ] `vite.config.ts` — 仍为 3 行委托（不改，改的是 shared/vite-base.config.ts，但那个是共享的，通常也不用动）

## C. CLI 注册（5 处必改，缺一不可）

- [ ] C1. `packages/pi-cli/src/lib/templates.ts` — TEMPLATES 数组加条目
- [ ] C2. `packages/pi-cli/package.json` sync-templates — 加 rm + rsync + eslint-plugin-rpc 复制
- [ ] C3. `packages/pi-cli/package.json` prepublishOnly — 加 `test -d templates/<type>/src`
- [ ] C4. `packages/pi-cli/scripts/post-sync-templates.mjs` — templateNames 数组加名字
- [ ] C5. `packages/pi-cli/src/commands/update.ts` — detectTemplateMeta 加识别分支
- [ ] C6. `packages/pi-cli/src/__tests__/templates.test.ts` — toHaveLength +1 + 各项断言

## D. 验证

- [ ] `cd packages/pi-cli && bun test src/__tests__/templates.test.ts` 通过
- [ ] `cd packages/pi-cli && bun run sync-templates` 成功，生成完整模板目录
- [ ] 同步后检查：`eslint.config.mjs` 已改写为 `./eslint-plugin-rpc/index.js`
- [ ] 同步后检查：`package.json` 已删除 `@dyyz1993/eslint-plugin-rpc: workspace:*`
- [ ] 同步后检查：存在 `eslint-plugin-rpc/` 子目录
- [ ] 端到端：`create-agent create test-app --type <your-template>` 成功
- [ ] 端到端：`cd test-app && bun run dev:web` 能启动，无报错
- [ ] 端到端：WebSocket 连接正常（DevTools Network → WS 有消息）

## E. 文档与提交

- [ ] README.md 完整（含 RPC 模块表、环境变量表、结构树）
- [ ] Commit message 遵循 Conventional Commits：`feat(cli): add <type> template`
