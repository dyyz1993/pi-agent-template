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
  /** 获取连接状态（用户视角，不暴露技术细节） */
  "browser.getConnectionGuide": {
    params: {};
    result: { connected: boolean; tabs: number };
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
  /** 执行单个 xbrowser 命令（如 scrape/crawl/map/goto/click 等） */
  "browser.execXbrowser": {
    params: { command: string; tabIndex?: number };
    result: { success: boolean; data?: any };
  };
  /** 开始录制浏览器操作 */
  "browser.recordStart": {
    params: { session?: string; url?: string };
    result: { success: boolean; session: string; startUrl?: string };
  };
  /** 停止录制，返回录制数据 */
  "browser.recordStop": {
    params: { session?: string };
    result: { success: boolean; actions: number; network: number; durationMs: number; steps: number; data?: any };
  };
  /** 查询录制状态 */
  "browser.recordStatus": {
    params: { session?: string };
    result: { recording: boolean; actions?: number; network?: number; hasRecording?: boolean };
  };
  /** Agent 加工录制数据（流式推送 browser.* 事件） */
  "browser.processRecording": {
    params: { sessionId: string; recordingData: any; title?: string };
    result: { messageId: string; text: string };
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
