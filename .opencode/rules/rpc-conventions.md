---
globs: packages/rpc-core/**/*.ts
keywords: rpc, transport, method, handler
match: any
---

# RPC 模块规范

- 新增 RPC 方法必须同时在 `types.ts` 定义 request/response 类型
- handler 必须包含输入验证和错误处理
- 方法命名：`模块.动作`（如 `git.getStatus`）
- 禁止在 handler 中直接访问文件系统，通过依赖注入
- transport 层只负责序列化/传输，不包含业务逻辑
- 错误必须使用 `RpcError` 类，包含 code 和 message
