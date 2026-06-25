/**
 * Browser 模块 — 浏览器控制、Agent 对话、采集
 *
 * 对应 PRD §7.2 SSE 流式 API / §6 Agent 设计
 */

export interface BrowserMethods {
  /** 检测浏览器连接状态 */
  "browser.checkConnection": {
    params: { pluginId?: string };
    result: { connected: boolean; browserCount: number; browsers: { pluginId: string; name: string; tabs: number }[] };
  };
  /** 获取 Chrome Tab 列表 */
  "browser.listTabs": {
    params: {};
    result: { total: number; activeIndex: number; tabs: { index: number; url: string; title: string; active: boolean }[] };
  };
  /** xbrowser 插件列表 */
  "browser.listPlugins": {
    params: {};
    result: { plugins: { name: string; description: string }[] };
  };
  /** Agent 对话（触发 Agent 循环，事件通过 RPC 事件推送） */
  "browser.agentChat": {
    params: { message: string; sessionId: string; activePlugins?: string[] };
    result: { messageId: string; text: string; steps: { label: string; status: string; detail?: string }[] };
  };
  /** 执行单个 xbrowser 命令 */
  "browser.execXbrowser": {
    params: { command: string };
    result: { success: boolean; data?: any };
  };
  /** 系统信息 */
  "browser.getSystemInfo": {
    params: {};
    result: {
      xbrowser: { available: boolean; version: string | null };
      browser: { connected: boolean; browsers: any[] };
      serverVersion: string;
    };
  };
}

export interface BrowserEvents {
  /** Agent 开始 */
  "browser.agentStart": { messageId: string; reply: string };
  /** 工具调用 */
  "browser.toolCall": { messageId: string; toolCall: { id: string; tool: string; input: string; status: string } };
  /** 工具结果 */
  "browser.toolResult": { messageId: string; toolCallId: string; output: string };
  /** 轮次切换 */
  "browser.turn": { messageId: string; turn: number; maxTurns: number };
  /** 思考增量 */
  "browser.thinking": { messageId: string; delta: string };
  /** 文本增量 */
  "browser.textDelta": { messageId: string; delta: string };
  /** Agent 完成 */
  "browser.done": { messageId: string; reply: string; steps: any[] };
  /** 采集进度 */
  "browser.progress": { messageId: string; steps: { label: string; status: string; detail?: string }[] };
}
