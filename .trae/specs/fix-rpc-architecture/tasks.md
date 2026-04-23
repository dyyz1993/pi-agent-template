# Tasks

## Phase 1: 底层服务建设（从原始项目迁移）

### 1. 核对 rpc-core/electrobun.ts
- [x] 1.1: 检查 `packages/rpc-core/src/transports/electrobun.ts` 是否与原项目一致
- [x] 1.2: 如有必要，从 `my-react-tailwind-vite-app2/src/gateway/ipc-transport.ts` 同步代码

### 2. 迁移 rpc-server.ts
- [x] 2.1: 创建 `packages/rpc-core/src/services/rpc-server.ts`
- [x] 2.2: 从原项目 `src/gateway/rpc-server.ts` 迁移 `createServer()` 工厂函数
- [x] 2.3: 在 `rpc-core/src/browser-index.ts` 中导出

### 3. 迁移 desktop-server.ts
- [x] 3.1: 创建 `packages/rpc-core/src/services/desktop-server.ts`
- [x] 3.2: 从原项目 `src/gateway/desktop.ts` 迁移 `createDesktopServer()` 工厂函数
- [x] 3.3: 在 `rpc-core/src/browser-index.ts` 中导出

## Phase 2: Web 端修复

### 4. 重构 main.tsx
- [x] 4.1: 删除 `template/src/mainview/rpc-browser.js`
- [x] 4.2: 更新 `main.tsx`，导入 `RPCClient` + `BrowserTransport` from `@chat-agent/rpc-core`
- [x] 4.3: 确保 `transport.connect()` 被调用（持久连接）
- [x] 4.4: 构建验证 Vite 不报 `http` / `ws` 模块错误

### 5. 验证 Web 端
- [x] 5.1: 启动 WebSocket server: `bun run src/server.ts`
- [x] 5.2: 启动 Vite dev server: `npx vite`
- [x] 5.3: 访问 http://localhost:5173，点击 Call 按钮
- [x] 5.4: 确认多次调用后 WebSocket 仍是同一连接（不断开）

## Phase 3: 桌面端 IPC 修复

### 6. 重构 bun/index.ts
- [x] 6.1: 导入 `createDesktopServer()` from `@chat-agent/rpc-core`
- [x] 6.2: 使用工厂函数创建 server + transport + rpc
- [x] 6.3: 确认发送通道用 `'message'` 而非 `'rpc-message'`
- [x] 6.4: 注册 ping/hello/echo/listDir handlers

### 7. 验证桌面端
- [ ] 7.1: 构建: `npx vite build`
- [ ] 7.2: 复制 dist → views
- [ ] 7.3: 启动: `npx electrobun dev`
- [ ] 7.4: 点击 Call 按钮，确认 ping 返回结果

## Phase 4: 服务端订阅功能

### 8. 更新 server.ts
- [x] 8.1: 使用 `rpc-core` 的 `TypedRPCServer` 替代简单 switch-case
- [x] 8.2: 实现 `subscribe` / `unsubscribe` 处理
- [x] 8.3: 实现事件推送（`emit('stream', ...)`）

### 9. 验证订阅功能
- [ ] 9.1: 服务端启动后，客户端订阅 `stream` 事件
- [ ] 9.2: 确认事件能推送到客户端

## Phase 5: 清理
- [x] 10.1: 删除 `template/src/rpc-browser.js`（如还存在）
- [x] 10.2: 确认所有代码符合 spec.md 要求
