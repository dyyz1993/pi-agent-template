import { useEffect } from "react";
import { useConnectionStore } from "../stores/use-connection-store";
import { useLogStore } from "../stores/use-log-store";
import { useChatStore } from "../stores/use-chat-store";
import { useSessionStore } from "../stores/use-session-store";
import { apiClient } from "../lib/api-client";

export function useRpcInit() {
  const ready = useConnectionStore((s) => s.ready);
  const addLog = useLogStore((s) => s.addLog);
  const initializeConnection = useConnectionStore((s) => s.initializeConnection);

  useEffect(() => {
    initializeConnection();
  }, [initializeConnection]);

  useEffect(() => {
    if (!ready) return;

    let subscriptionId: string | null = null;

    const setup = async () => {
      subscriptionId = await apiClient.subscribe("chat.message", (payload) => {
        useChatStore.setState((s) => ({
          messages: [
            ...s.messages,
            {
              id: payload.id,
              role: (payload.role === "assistant" ? "agent" : "user") as "user",
              text: payload.content,
              at: payload.timestamp,
            } as any,
          ],
        }));
      }, {});
      addLog("Subscribed to chat.message");

      try {
        const history = await apiClient.call("chat.list", { limit: 100 });
        if (history.messages.length > 0) {
          useChatStore.getState().setMessages(
            history.messages.map((m: { id: string; role: "user" | "assistant"; content: string; timestamp: number }) => ({
              id: m.id,
              role: m.role === "assistant" ? "agent" : "user",
              text: m.content,
              at: m.timestamp,
            }))
          );
          addLog(`Loaded ${history.messages.length} history messages`);
        }
      } catch (err) {
        addLog(`Failed to load history: ${err instanceof Error ? err.message : String(err)}`);
      }

      // 确保有一个默认空会话，用户可以直接输入
      try {
        const sid = await useSessionStore.getState().ensureDefaultSession();
        addLog(`Active session: ${sid}`);
      } catch (err) {
        addLog(`Failed to ensure default session: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    setup();

    return () => {
      if (subscriptionId) {
        apiClient.unsubscribe(subscriptionId);
      }
    };
  }, [ready, addLog]);
}
