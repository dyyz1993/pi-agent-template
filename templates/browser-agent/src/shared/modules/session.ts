/**
 * Session 模块 — 会话管理、消息、资源
 *
 * 对应 PRD §8 数据模型 — User → Session → Message + Asset
 */

export interface SessionMethods {
  /** 创建会话 */
  "session.create": {
    params: { title?: string };
    result: { id: string; title: string; createdAt: number };
  };
  /** 获取会话详情 */
  "session.get": {
    params: { id: string };
    result: {
      id: string; title: string; messages: any[]; assets: any[];
      createdAt: number; status: string;
    } | null;
  };
  /** 会话列表 */
  "session.list": {
    params: {};
    result: {
      sessions: { id: string; title: string; createdAt: number; status: string; messageCount: number; assetCount: number }[];
    };
  };
  /** 添加消息 */
  "session.addMessage": {
    params: { sessionId: string; message: { role: string; text: string; id?: string } };
    result: { id: string } | null;
  };
  /** 更新最后一条 agent 消息 */
  "session.updateLastMessage": {
    params: { sessionId: string; patch: Record<string, any> };
    result: { ok: boolean };
  };
  /** 设置会话状态 */
  "session.setStatus": {
    params: { sessionId: string; status: string };
    result: { ok: boolean };
  };
  /** 获取会话历史消息（从 Agent 获取） */
  "session.getMessages": {
    params: { sessionId: string };
    result: { messages: any[] };
  };
  /** 清理 Agent session */
  "session.disposeAgent": {
    params: { sessionId: string };
    result: { ok: boolean };
  };
}

export interface SessionEvents {}
