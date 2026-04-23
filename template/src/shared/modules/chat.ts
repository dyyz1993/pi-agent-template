/**
 * Chat 模块 — 聊天消息
 */
export interface ChatMethods {
  "chat.list": {
    params: { limit?: number; cursor?: string };
    result: {
      messages: { id: string; role: "user" | "assistant"; content: string; timestamp: number }[];
      hasMore: boolean;
    };
  };
  "chat.send": {
    params: { content: string };
    result: { id: string; role: "assistant"; content: string; timestamp: number };
  };
}

export interface ChatEvents {
  "chat.message": { id: string; role: "user" | "assistant"; content: string; timestamp: number };
}
