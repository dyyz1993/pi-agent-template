import { useEffect } from "react";
import { useAppStore } from "../stores/use-app-store";
import { useExplorerStore } from "../stores/use-explorer-store";
import { useChatStore } from "../stores/use-chat-store";
import { apiClient } from "../lib/api-client";

export function useRpcInit() {
  const ready = useAppStore((s) => s.ready);
  const addLog = useAppStore((s) => s.addLog);
  const initializeConnection = useAppStore((s) => s.initializeConnection);
  const listRootDir = useExplorerStore((s) => s.listRootDir);

  useEffect(() => {
    initializeConnection();
  }, [initializeConnection]);

  useEffect(() => {
    if (!ready) return;

    let subscriptionId: string | null = null;

    const setup = async () => {
      listRootDir();

      subscriptionId = await apiClient.subscribe("chat.message", (payload) => {
        useChatStore.getState().addMessage({
          id: payload.id,
          role: payload.role,
          content: payload.content,
          timestamp: payload.timestamp,
        });
      }, {});
      addLog("Subscribed to chat.message");

      try {
        const history = await apiClient.call("chat.list", { limit: 100 });
        if (history.messages.length > 0) {
          useChatStore.getState().setMessages(
            history.messages.map((m: { id: string; role: "user" | "assistant"; content: string; timestamp: number }) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: m.timestamp,
            }))
          );
          addLog(`Loaded ${history.messages.length} history messages`);
        }
      } catch (err) {
        addLog(`Failed to load history: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    setup();

    return () => {
      if (subscriptionId) {
        apiClient.unsubscribe(subscriptionId);
      }
    };
  }, [ready, addLog, listRootDir]);
}
