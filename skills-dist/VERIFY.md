# VERIFY.md — pi-agent-template 技能验证指令

> **你（AI 助手）正在阅读这份文件。**
> 你的任务是：克隆项目 → 安装技能 → 验证每个技能是否与项目实际一致 → 出报告 → 清理。
> 这是一份**独立性审计**，目的是验证 Skill 作者声明的每一条是否真实成立。

---

## Step 0：准备工作环境

```bash
# 克隆项目
git clone https://github.com/dyyz1993/pi-agent-template.git /tmp/pi-agent-verify
cd /tmp/pi-agent-verify

# 安装依赖（如果技能验证需要跑测试）
cd templates/general && bun install --frozen-lockfile 2>/dev/null || bun install
cd /tmp/pi-agent-verify
```

## Step 1：安装待验证的技能

```bash
# 用本地方式安装 skills-dist/ 里的 4 个 skill
bash skills-dist/install.sh
```

> 确认安装成功：输出应显示 4 个 skill 已安装到 `~/.agents/skills/`。

## Step 2：逐条验证每个技能

对下面每个 skill，**逐条验证其声明的内容是否与项目实际代码一致**。

验证方式：读技能文件 → 对照项目实际目录/代码/配置 → 给出判定。

---

### Skill A：pi-template-create

**技能路径：** `.opencode/skills/pi-template-create/SKILL.md`

#### A-1：心智模型声明

> "共享骨架（不可改）+ 业务模块（你来写）+ CLI 注册（5 处必改）"

验证项：

- [ ] `src/shared/lib/` 下是否有 `web-server.ts`、`port-registry.ts`、`logger.ts`、`path-security.ts`
- [ ] `src/gateway/ipc-transport.ts` 是否存在
- [ ] `scripts/dev.ts` 是否存在
- [ ] 这些骨架文件在 4 个模板（general/chat/agent/browser-agent）间是否逐字节相同（`diff` 对比）
- [ ] `packages/pi-cli/src/lib/templates.ts` 的 `TEMPLATES` 数组中是否有 4 个条目

#### A-2：Step 5 — CLI 注册 Checklist（5 处必改）

验证以下 5 个注册点是否全部到位：

| 编号 | 文件                                              | 检查项                                            | 预期                                                             |
| ---- | ------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------- |
| A-2a | `packages/pi-cli/src/lib/templates.ts`            | TEMPLATES 数组包含 browser-agent                  | 有 browser-agent 条目                                            |
| A-2b | `packages/pi-cli/package.json`                    | sync-templates 脚本含 browser-agent 的 rm + rsync | 有 `rm -rf templates/browser-agent` 和 `rsync ... browser-agent` |
| A-2c | `packages/pi-cli/package.json`                    | prepublishOnly 校验 browser-agent                 | 包含 `test -d templates/browser-agent/src`                       |
| A-2d | `packages/pi-cli/scripts/post-sync-templates.mjs` | templateNames 含 browser-agent                    | 数组包含 `'browser-agent'`                                       |
| A-2e | `packages/pi-cli/src/commands/update.ts`          | detectTemplateMeta 有 browser-agent 分支          | `modules.has("browser")` 分支存在                                |
| A-2f | `packages/pi-cli/src/__tests__/templates.test.ts` | 断言更新                                          | `toHaveLength(4)` + browser-agent 用例存在                       |
| A-2g | `packages/pi-cli/src/__tests__/cli.test.ts`       | list 输出断言                                     | 包含 browser-agent                                               |

#### A-3：端口规划表

验证 `templates/browser-agent/src/server-config.ts` 中：

- `port` 默认值是否为 5200
- `corsOrigin` 默认值是否为 `http://localhost:7200`

#### A-4：检查清单文件

- [ ] `.opencode/skills/pi-template-create/references/template-checklist.md` 是否存在

---

### Skill B：pi-rpc-module-dev

**技能路径：** `.opencode/skills/pi-rpc-module-dev/SKILL.md`

#### B-1：Step 1-5 流程完整性

验证技能声称的三层架构是否与项目一致：

- [ ] `src/shared/modules/system.ts` 存在且导出 `SystemMethods` 接口
- [ ] `src/shared/handlers/system.ts` 存在且导出 `register(server, options)` 函数
- [ ] `src/shared/rpc-schema.ts` 的 `RPCMethods` extends 链包含 `SystemMethods`
- [ ] `src/shared/handlers/index.ts` 有 `export { register as system }` 行
- [ ] `src/shared/register-all-handlers.ts` 存在，且通过 `Object.values(handlers)` 遍历注册

#### B-2：测试框架验证

技能中的测试示例使用 `vitest` + `vi.resetModules()`。

验证：

- [ ] `templates/general/package.json` 的 `"test"` 脚本是 `"vitest run"`
- [ ] 找一个现有测试文件（如 `templates/general/src/mainview/stores/__tests__/use-theme-store.test.ts`），确认 import 来自 `"vitest"`
- [ ] `vi.resetModules()` 是否在该模板测试中可用

**实际跑一下测试：**

```bash
cd templates/general && npx vitest run src/mainview/stores/__tests__/use-theme-store.test.ts 2>&1 | tail -10
```

预期：测试通过。

#### B-3：ESLint 规则验证

技能声明有 6 条 ESLint 强制规则（R1-R6）：

- [ ] `packages/eslint-plugin-rpc/rules/no-bare-method.js` 存在
- [ ] `packages/eslint-plugin-rpc/rules/no-direct-register.js` 存在
- [ ] `packages/eslint-plugin-rpc/rules/schema-merge-only.js` 存在
- [ ] `packages/eslint-plugin-rpc/rules/module-file-naming.js` 存在
- [ ] `packages/eslint-plugin-rpc/rules/require-typed-register.js` 存在
- [ ] `packages/eslint-plugin-rpc/rules/require-api-client.js` 存在

#### B-4：代码示例语法验证

技能中有多处 TypeScript 代码示例。验证这些语法在项目 tsconfig 下是否编译通过：

- [ ] 复制技能中的 `RegisterFn` 包装器模式代码，确认与现有 handler 一致
- [ ] 方法命名格式 `"module.action"` 是否与实际 handler 中的方法名一致

---

### Skill C：pi-template-dev

**技能路径：** `.opencode/skills/pi-template-dev/SKILL.md`

#### C-1：CSS 变量系统

技能声明有 30 个 CSS 变量，分 5 类（背景、文字、边框、强调、徽章）。

验证：

```bash
cd templates/general/src/mainview
grep -c '--color-' index.css
```

- [ ] `:root` 中 `--color-*` 变量数量是否 ≥20
- [ ] `.dark` 中是否有对应的深色值
- [ ] 组件是否通过 `var(--color-xxx)` 引用颜色（而非 Tailwind `dark:` 类）
  ```bash
  grep -r 'dark:bg-\|dark:text-\|dark:border-' components/ --include='*.tsx' | wc -l
  ```
  预期：结果 ≈ 0

#### C-2：i18n 国际化系统

- [ ] `lib/i18n/index.ts` 是否存在且包含 `i18n.use(initReactI18next)` 初始化
- [ ] `lib/i18n/locales/en.json` 是否存在
- [ ] `lib/i18n/locales/zh.json` 是否存在
- [ ] `en.json` 的 key 是否覆盖技能声称的模块（sidebar/chat/explorer/git/feed/todo/rules/bash/diff/debug 等）

#### C-3：Zustand Store 规范

- [ ] `src/mainview/stores/` 下是否有多个 `.ts` 文件（≥8 个）
- [ ] 找一个现有 Store（如 `use-app-store.ts`），验证其结构是否与技能中的模板一致：
  - 用 `create` 函数导出
- [ ] 技能声称"无 Props Drilling，组件直接从 store 读取数据"，找一个组件验证是否直接 `useXxxStore()` 而非 props 传递

#### C-4：虚拟化列表

技能声明列表超过 100 条时用 `@tanstack/react-virtual`。

验证：

- [ ] `templates/general/package.json` 的 dependencies 中是否有 `@tanstack/react-virtual`

---

### Skill D：pi-fullstack-debug

**技能路径：** `.opencode/skills/pi-fullstack-debug/SKILL.md`

#### D-1：引用的文件是否存在

技能的关键文件表中引用了多个文件路径，逐条验证：

| 编号 | 技能中声明的文件                              | 在 general 模板中是否存在 |
| ---- | --------------------------------------------- | ------------------------- |
| D-1a | `src/mainview/lib/api-client.ts`              |                           |
| D-1b | `src/mainview/lib/rpc-cache.ts`               |                           |
| D-1c | `src/mainview/stores/use-connection-store.ts` |                           |
| D-1d | `src/gateway/ws-handler.ts`                   |                           |
| D-1e | `src/gateway/http-routes.ts`                  |                           |
| D-1f | `src/shared/lib/path-security.ts`             |                           |
| D-1g | `src/shared/lib/bash-security.ts`             |                           |
| D-1h | `src/shared/rpc-schema.ts`                    |                           |

**注意：** `bash-security.ts` 仅 agent 模板有（general 没有）。验证时需识别这个差异。

#### D-2：全栈调用链路图

技能声明调用链路为：

```
用户操作 → React 组件 → Store action → apiClient.call() → RPCClient → Transport 层 → Server Handler → 业务逻辑
```

验证：

- [ ] 找一个实际 Store action（如 `use-chat-store.ts`），确认它调用了 `apiClient.call()`
- [ ] 找到 `apiClient.call()` 的实现（在 `lib/api-client.ts` 中），确认它包装了 RPCClient

#### D-3：调试工具命令

技能中提到的调试命令是否可运行：

- [ ] `rpcCache.clear()` — 确认 `rpc-cache.ts` 中有 clear 方法
- [ ] `apiClient.isConnected()` — 确认 api-client 中有该方法或等效属性

---

## Step 3：汇总报告

按以下格式输出最终报告：

```markdown
# pi-agent-template 技能验证报告

验证时间：$(date)

## 总体结论

✅ / ⚠️ / ❌ （选择一个）

## 逐项结果

### Skill A：pi-template-create

| 检查项                   | 结果         | 备注 |
| ------------------------ | ------------ | ---- |
| A-1 心智模型骨架文件     | ✅/❌        |      |
| A-2a templates.ts 注册   | ✅/❌        |      |
| A-2b sync-templates 脚本 | ✅/❌        |      |
| A-2c prepublishOnly 校验 | ✅/❌        |      |
| A-2d post-sync.mjs       | ✅/❌        |      |
| A-2e update.ts 识别      | ✅/❌        |      |
| A-2f templates.test.ts   | ✅/❌        |      |
| A-2g cli.test.ts         | ✅/❌        |      |
| A-3 端口规划             | ✅/❌        |      |
| A-4 检查清单文件         | ✅/❌        |      |
| **小计**                 | **N/N 通过** |      |

### Skill B：pi-rpc-module-dev

...（同上格式）

### Skill C：pi-template-dev

...（同上格式）

### Skill D：pi-fullstack-debug

...（同上格式）

## 关键发现

列出任何声明与实际不符的情况。

## 建议改进

如果有任何可改进点，在此列出。
```

## Step 4：清理环境

```bash
rm -rf /tmp/pi-agent-verify
```

---

## 附：各 skill 的远程地址

如果你需要直接下载单个 skill 的完整内容以供阅读：

```
https://raw.githubusercontent.com/dyyz1993/pi-agent-template/main/.opencode/skills/pi-template-create/SKILL.md
https://raw.githubusercontent.com/dyyz1993/pi-agent-template/main/.opencode/skills/pi-rpc-module-dev/SKILL.md
https://raw.githubusercontent.com/dyyz1993/pi-agent-template/main/.opencode/skills/pi-template-dev/SKILL.md
https://raw.githubusercontent.com/dyyz1993/pi-agent-template/main/.opencode/skills/pi-fullstack-debug/SKILL.md
```
