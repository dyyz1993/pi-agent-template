# Pi Agent 已知问题与解决方案

## 1. WebSocket 重连后事件订阅丢失

**问题：** WebSocket 断连重连成功后，之前通过 `apiClient.subscribe()` 注册的事件处理器不再收到消息。

**根因：** `WebSocketTransport` 重连时创建新的 WebSocket 实例，服务端的订阅状态绑定在旧连接上。新连接建立后，服务端不知道客户端之前订阅了什么事件。

**解决方案：**
- 在 `WebSocketTransport` 的 `connect()` 成功回调中，重新发送所有活跃订阅
- 或在 `apiClient` 层维护订阅列表，检测到重连后自动重新订阅

**相关文件：**
- `packages/rpc-core/src/transports/websocket.ts` — 重连逻辑（`scheduleReconnect`）
- `templates/agent/src/mainview/lib/api-client.ts` — `subscribe()` / `unsubscribe()`
- `templates/agent/src/gateway/ws-handler.ts` — 服务端订阅管理

---

## 2. Bash 输出无限增长导致 UI 卡顿

**问题：** 长时间运行的 Bash 命令（如 `tail -f`、`watch`）持续输出，BashPanel 渲染越来越卡。

**根因：** Bash 输出通过 RPC 事件流式推送到前端，前端将所有输出累积在 state 中。没有输出截断或虚拟化机制。

**解决方案：**
- 在 Bash handler 中限制输出缓冲区大小（如最大 10000 行）
- 在前端使用虚拟列表渲染输出
- 提供"清除输出"按钮

**相关文件：**
- `templates/agent/src/mainview/components/BashPanel.tsx` — Bash 输出显示
- Bash handler（处理 `bash.execute` RPC 方法的文件）

---

## 3. 端口冲突 — 残留 Bun 进程

**问题：** 开发过程中多次启动/停止后端，残留的 Bun 进程占用 3100-3110 端口范围，导致新实例无法启动或前端连到旧实例。

**根因：** 进程未正常退出（如 Ctrl+C 时 `.server-port` 清理未执行），或多个开发终端同时运行。

**解决方案：**
```bash
# 清理残留进程（通过端口查找 PID 再 kill）
lsof -i :3100-3110 | grep LISTEN
kill $(lsof -t -i :3100-3110) 2>/dev/null

# 或只清理端口文件
rm -f .server-port
```

**相关文件：**
- `templates/agent/src/server.ts` — 端口协商（`findAvailablePort`）、端口文件清理
- `templates/agent/src/shared/lib/port-registry.ts` — 端口注册表

---

## 4. Vite 代理路径不匹配

**问题：** 页面永远显示 "Connecting to RPC server..." 转圈，WebSocket 无法连接。

**根因：** 后端 `WebSocketServer` 配置的 path 是 `/`，但 Vite 代理从 `/ws` 转发。如果 `vite.config.ts` 缺少 rewrite 规则将 `/ws` 改写为 `/`，则 WS upgrade 请求被拒绝。

**解决方案：**
确认 `vite.config.ts` 中代理配置：
```typescript
proxy: {
  '/ws': {
    target: `ws://localhost:${backendPort}`,
    ws: true,
    rewrite: (path) => path.replace(/^\/ws/, '/'),
  },
}
```

**状态：** 已修复并验证

**相关文件：**
- `vite.config.ts` — Vite 代理配置
- `templates/agent/src/gateway/ws-handler.ts` — WebSocketServer path 配置

---

## 5. 长对话 ChatPanel 渲染卡顿

**问题：** Chat 面板发送大量消息后，渲染变慢，输入延迟增加。

**根因：** 所有聊天消息渲染为 DOM 节点，无虚拟化。每条新消息触发整个列表重新渲染。

**解决方案：**
- 使用虚拟列表（如 `react-window` 或 `@tanstack/virtual`）
- 限制渲染的消息数量（如只渲染最近 100 条）
- 对消息列表做 `React.memo` 优化

**相关文件：**
- `templates/agent/src/mainview/components/ChatPanel.tsx` — 聊天消息渲染

---

## 6. E2E 测试多 Agent 浏览器干扰

**问题：** 多个 agent 同时运行 UI 测试时，浏览器页面意外跳转到 `about:blank` 或其他 agent 操作的页面。

**根因：** 多个 agent 共享同一个 `agent-browser` daemon，浏览器实例互相干扰。

**解决方案：**
使用隔离的 socket 目录：
```bash
AGENT_BROWSER_SOCKET_DIR=/tmp/agent-browser-sock-isolated npx playwright test
```

**相关文件：**
- `.ui-tester/knowledge/agent-template/patterns.yml` — 已知 tips

---

## 7. Token 不匹配导致 WS 连接被拒

**问题：** WebSocket 连接立即关闭，前端不断重连。

**根因：** 前端 Token 来源（URL query > localStorage > 默认值）与服务端配置的 Token 不一致。

**排查：**
1. 打开 DevTools → Network → WS，查看连接请求的 `?token=` 参数
2. 对比服务端 `server-config.ts` 中的 Token 配置
3. 清除 localStorage 中的 `rpc-auth-token` 重新获取

**相关文件：**
- `templates/agent/src/mainview/lib/api-client.ts:12-22` — `resolveAuthToken()`
- `templates/agent/src/server-config.ts` — 服务端 Token 配置
- `templates/agent/src/gateway/ws-handler.ts` — Token 验证逻辑

---

## 8. RPC 缓存导致数据不更新

**问题：** 修改了文件但 Explorer 没刷新，或 Git 状态不对。

**根因：** `rpcCache` 对 GET 类方法有缓存（TTL 2-5s）。在缓存有效期内，相同参数的调用直接返回缓存结果。

**排查：**
```javascript
// Console 中检查缓存状态
import { rpcCache } from './lib/rpc-cache';
rpcCache.invalidate('file.listDir');  // 清除特定方法缓存
rpcCache.clear();                     // 清除所有缓存
```

**解决方案：**
- 等待缓存过期（通常 2-5 秒）
- 在写入操作后主动调用 `rpcCache.invalidate('method.name')`
- 调整 `CACHEABLE_METHODS` 中的 TTL 值

**相关文件：**
- `templates/agent/src/mainview/lib/rpc-cache.ts` — 缓存实现和配置
