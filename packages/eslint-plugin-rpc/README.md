# @dyyz1993/eslint-plugin-rpc

ESLint rules enforcing the RPC conventions of
[`@dyyz1993/rpc-core`](../rpc-core) in projects created from
`@dyyz1993/create-agent`. The plugin is vendored into every template
(`./eslint-plugin-rpc/index.js`) so generated projects work without an extra
npm dependency.

## Usage (flat config)

```js
// eslint.config.mjs
import rpcPlugin from "./eslint-plugin-rpc/index.js";

export default tseslint.config(
	// ...
	rpcPlugin.configs["flat/recommended"]
);
```

## Rules

| Rule                           | Description                                                                               |
| ------------------------------ | ----------------------------------------------------------------------------------------- |
| `rpc/no-bare-method`           | `register/call/subscribe/emitEvent` 方法名必须使用 `module.action` 格式                   |
| `rpc/no-direct-register`       | `server.register()` 只允许出现在 `shared/handlers/` 目录                                  |
| `rpc/schema-merge-only`        | `rpc-schema.ts` 只允许 `extends` 合并，禁止直接定义方法（interface 和 type alias 都检查） |
| `rpc/module-file-naming`       | `modules/` 下文件必须导出 `XxxMethods` 接口，方法/事件 key 必须以 `module.` 为前缀        |
| `rpc/require-typed-register`   | 入口文件必须导入并调用 `registerAllHandlers`（支持别名导入）                              |
| `rpc/require-api-client`       | `mainview/` 下禁止直接操作 WebSocket（含 `window.WebSocket`）或裸传输层 `.send()`         |
| `rpc/no-hardcoded-strings`     | JSX 禁止硬编码英文字符串，提示走 i18n `t()`（`warn` 级别）                                |
| `rpc/no-deep-relative-imports` | 禁止超过 2 层 `../` 的相对路径导入（含 `export ... from`），应使用 `@shared/*` 别名       |

## Options

```js
// rpc/no-bare-method — which receiver names are treated as RPC entry points
"rpc/no-bare-method": ["error", { objectNames: ["apiClient", "server"] }]

// rpc/no-direct-register
"rpc/no-direct-register": ["error", {
  serverNames: ["server", "rpcServer"],
  entryFiles: ["bun/index.ts", "server.ts"],
  handlersDirs: ["shared/handlers"],
}]

// rpc/require-typed-register
"rpc/require-typed-register": ["error", { entryFiles: ["bun/index.ts"] }]

// rpc/require-api-client — exact variable names treated as raw transports
"rpc/require-api-client": ["error", { transportNames: ["ws", "websocket", "socket"] }]

// rpc/no-hardcoded-strings
"rpc/no-hardcoded-strings": ["warn", {
  ignoreAttributes: ["className", "href", /* ... */],
  ignoreComponents: ["Icon", "Panel"],  // suppress everything inside these components
  ignorePrefixes: ["bg-", "https://"],
}]

// rpc/no-deep-relative-imports
"rpc/no-deep-relative-imports": ["error", { maxDepth: 2 }]
```

## Tests

```bash
cd packages/eslint-plugin-rpc
bun test tests/
```
