---
globs: "**/*.ts, **/*.tsx"
keywords: import, path, alias, relative, @shared, @dyyz1993
match: any
---

# Import 路径规范

## 核心规则：禁止超过 2 层 `../` 的相对路径

ESLint 规则 `rpc/no-deep-relative-imports` 会在提交时自动检查。
如果 lint 失败，错误信息会指向此文档。

## 可用的路径别名

| 别名                 | 指向                                | 用途                             |
| -------------------- | ----------------------------------- | -------------------------------- |
| `@shared/*`          | `../shared/*`（模板的共享代码目录） | 引用 shared 下的模块、类型、工具 |
| `@dyyz1993/rpc-core` | `packages/rpc-core/src/index.ts`    | 引用 RPC 框架核心                |

## 正确 vs 错误示例

### 正确（使用别名）

```typescript
// 引用 shared 模块
import type { FeedCategory } from "@shared/modules/feed";
import type { TodoStatus } from "@shared/modules/todo";
import { createLogger } from "@shared/lib/logger";

// 引用 RPC 核心
import { RPCServer } from "@dyyz1993/rpc-core";
```

### 错误（超过 2 层 ../）

```typescript
// 3 层 — 应改为 @shared 别名
import type { FeedCategory } from "../../../shared/modules/feed";
import type { TodoStatus } from "../../../shared/modules/todo";
import { createLogger } from "../../../shared/lib/logger";

// 4 层+ — 严重违规
import { httpRoutes } from "../../../../shared/http-routes";
```

### 允许的相对路径（≤2 层）

```typescript
import { helper } from "./utils"; // 同目录
import { types } from "../parent"; // 1 层
import { shared } from "../../shared"; // 2 层（上限）
```

## 修复指南

当 ESLint 报错 `rpc/no-deep-relative-imports` 时：

1. **找到违规的 import 行**（错误信息会标出文件和行号）
2. **判断目标路径属于哪个别名**：
   - 如果目标是 `shared/` 目录 → 改为 `@shared/...`
   - 如果目标是 `packages/rpc-core/` → 改为 `@dyyz1993/rpc-core`
3. **替换 import 路径**：
   ```
   ../../../shared/modules/feed → @shared/modules/feed
   ```
4. **验证**：运行 `bun run lint` 确认修复

## 配置

规则的 `maxDepth` 默认为 2（即允许 `./`、`../`、`../../`，禁止 `../../../` 及以上）。
可在 ESLint 配置中调整：

```js
"rpc/no-deep-relative-imports": ["error", { "maxDepth": 2 }]
```
