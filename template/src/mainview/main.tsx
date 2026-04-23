import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { apiClient } from "./lib/api-client";
import "./index.css";
import App from "./App";

const isElectrobun = typeof window !== "undefined" && !!(window as unknown as Record<string, unknown>).__electrobunBunBridge;

if (isElectrobun) {
  // 桌面端：同步初始化 IPC（Electrobun 要求 __electrobun 桥接在页面加载时同步设置）
  apiClient.initSyncForDesktop();
} else {
  // Web 端：异步初始化 WebSocket
  apiClient.initialize().catch(console.error);
}

// eslint-disable-next-line no-console
console.log("[Main] Application starting, isElectrobun:", isElectrobun);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
