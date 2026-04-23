# Checklist

## Phase 1: 底层服务建设

- [x] rpc-core/electrobun.ts 与原项目一致（通道名称已修正为 'message'）
- [x] rpc-core/src/services/rpc-server.ts 已创建并导出
- [x] rpc-core/src/services/desktop-server.ts 已创建并导出
- [x] rpc-core/src/browser-index.ts 正确导出新服务

## Phase 2: Web 端

- [x] `template/src/mainview/rpc-browser.js` 已删除
- [x] `template/src/mainview/main.tsx` 使用 `BrowserTransport` + `RPCClient`
- [x] `transport.connect()` 被调用
- [x] Vite 构建成功，无 `http`/`ws` 模块错误
- [ ] Web 端 Call 按钮工作正常
- [ ] WebSocket 保持持久连接（多次调用后不断开）

## Phase 3: 桌面端

- [x] `template/src/bun/index.ts` 使用 `ElectrobunTransport` + `TypedRPCServer`
- [x] 发送通道为 `'message'`，接收通道为 `'rpc-message'`
- [ ] ping 调用返回正确结果
- [ ] IPC 双向通信正常

## Phase 4: 服务端

- [x] server.ts 使用 `TypedRPCServer`
- [x] subscribe / unsubscribe 处理正常
- [ ] 事件推送机制工作正常

## Phase 5: 清理

- [x] 无残留的 rpc-browser.js 文件
- [x] 所有代码符合 spec.md
