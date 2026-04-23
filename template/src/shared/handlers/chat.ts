import type { RPCServer } from "@chat-agent/rpc-core";
import type { MethodParams, MethodResult } from "@chat-agent/rpc-core";
import type { RPCMethods, HandlerOptions } from "../rpc-schema";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";

// 存储路径 — 使用用户主目录，桌面端和 Web 端都能可靠写入
function getStoragePath(): string {
  const dir = join(homedir(), ".pi-agent");
  return join(dir, "chat-history.json");
}

type ChatMessage = { id: string; role: "user" | "assistant"; content: string; timestamp: number };

async function loadMessages(): Promise<ChatMessage[]> {
  const filePath = getStoragePath();
  try {
    if (!existsSync(filePath)) {
      // eslint-disable-next-line no-console
      console.log(`[Chat] No history file at ${filePath}`);
      return [];
    }
    const raw = await readFile(filePath, "utf-8");
    const msgs = JSON.parse(raw) as ChatMessage[];
    // eslint-disable-next-line no-console
    console.log(`[Chat] Loaded ${msgs.length} messages from ${filePath}`);
    return msgs;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log(`[Chat] Failed to load history:`, err);
    return [];
  }
}

async function saveMessages(messages: ChatMessage[]): Promise<void> {
  const filePath = getStoragePath();
  const dir = dirname(filePath);
  try {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    await writeFile(filePath, JSON.stringify(messages, null, 2), "utf-8");
    // eslint-disable-next-line no-console
    console.log(`[Chat] Saved ${messages.length} messages to ${filePath}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[Chat] Failed to save history:`, err);
  }
}

type RegisterFn = <K extends keyof RPCMethods & string>(
  method: K,
  handler: (params: MethodParams<RPCMethods, K>) => Promise<MethodResult<RPCMethods, K>>,
) => void;

export function register(server: RPCServer, _options: HandlerOptions): void {
  const r: RegisterFn = (method, handler) => {
    server.register(method, handler as (params: unknown) => Promise<unknown>);
  };

  r("chat.list", async (params) => {
    const all = await loadMessages();
    const limit = params.limit ?? 50;
    // 返回最新的 N 条消息（按时间正序）
    const messages = all.slice(-limit);
    return {
      messages,
      hasMore: all.length > limit,
    };
  });

  r("chat.send", async (params) => {
    const all = await loadMessages();

    // 写入 user 消息
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content: params.content,
      timestamp: Date.now(),
    };
    all.push(userMsg);

    // 通过订阅推送 user 消息
    server.emitEvent("chat.message", userMsg);

    // 生成 assistant 回复
    const reply: ChatMessage = {
      id: `msg-${Date.now()}-assistant`,
      role: "assistant",
      content: `[echo] ${params.content}`,
      timestamp: Date.now(),
    };
    all.push(reply);

    // 通过订阅推送 assistant 回复
    server.emitEvent("chat.message", reply);

    // 持久化
    await saveMessages(all);

    return { ok: true };
  });
}
