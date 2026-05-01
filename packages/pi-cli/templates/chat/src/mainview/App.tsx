import { useEffect, useState } from "react";
import { Wifi, Monitor } from "lucide-react";
import { apiClient } from "./lib/api-client";
import { useAppStore } from "./stores/use-app-store";
import { useChatStore } from "./stores/use-chat-store";
import { useSidebarStore } from "./stores/use-sidebar-store";
import { useBreakpointSync } from "./hooks/use-breakpoint";
import { ActivityBar } from "./components/activity-bar/ActivityBar";
import { MobileTabBar } from "./components/activity-bar/MobileTabBar";
import { ChatPanel } from "./components/chat/ChatPanel";

function App() {
  const mode = useAppStore((s) => s.mode);
  const ready = useAppStore((s) => s.ready);
  const initializeConnection = useAppStore((s) => s.initializeConnection);
  const addLog = useAppStore((s) => s.addLog);

  const breakpoint = useSidebarStore((s) => s.breakpoint);

  useBreakpointSync();

  const isMobile = breakpoint === "mobile";

  useEffect(() => {
    initializeConnection();
  }, [initializeConnection]);

  useEffect(() => {
    if (!ready) return;

    let subscriptionId: string | null = null;

    const setup = async () => {
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
  }, [ready, addLog]);

  if (!ready) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mb-4" />
          <div className="text-gray-400 text-sm">Connecting to RPC server...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden">
      {!isMobile && (
        <div className="h-8 bg-gray-800 flex items-center px-3 text-xs border-b border-gray-700 flex-shrink-0">
          <span className={`px-2 py-0.5 rounded flex items-center gap-1 ${mode === "desktop" ? "bg-green-600" : "bg-blue-600"}`}>
            {mode === "desktop" ? <Monitor className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
            {mode === "desktop" ? "Desktop (IPC)" : "Web (WebSocket)"}
          </span>
          <span className="ml-3 text-gray-400">Pi Chat</span>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        {!isMobile && <ActivityBar />}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ChatPanel />
        </div>
      </div>

      {isMobile && <MobileTabBar />}
    </div>
  );
}

export default App;
