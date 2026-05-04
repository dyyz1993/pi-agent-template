import { Wifi, Monitor, MessageSquare, Rss, Terminal, ListTodo } from "lucide-react";
import { useAppStore } from "../../stores/use-app-store";
import { useExplorerStore } from "../../stores/use-explorer-store";
import { useSidebarStore } from "../../stores/use-sidebar-store";
import { ActivityBar } from "../activity-bar/ActivityBar";
import { MobileTabBar } from "../activity-bar/MobileTabBar";
import { ExplorerSidebar } from "../explorer/ExplorerSidebar";
import { GitPanel } from "../git/GitPanel";
import { SearchPanel } from "../search/SearchPanel";
import { RulesPanel } from "../rules/RulesPanel";
import { ChatPanel } from "../chat/ChatPanel";
import { FeedPanel } from "../feed/FeedPanel";
import { BashPanel } from "../bash/BashPanel";
import { TodoPanel } from "../todo/TodoPanel";
import { FilePreviewOverlay } from "../file-preview/FilePreviewOverlay";
import { DiffViewerPanel } from "../diff/DiffViewerPanel";
import { DebugPanel } from "../debug/DebugPanel";

export type CenterTab = "chat" | "feed" | "bash" | "todo";

interface AppLayoutProps {
  centerTab: CenterTab;
  setCenterTab: (tab: CenterTab) => void;
  sidebarWidth: number;
  handleResizeStart: (e: React.MouseEvent) => void;
}

export function AppLayout({
  centerTab,
  setCenterTab,
  sidebarWidth,
  handleResizeStart,
}: AppLayoutProps) {
  const mode = useAppStore((s) => s.mode);
  const filePreview = useExplorerStore((s) => s.filePreview);
  const loadingFile = useExplorerStore((s) => s.loadingFile);
  const closePreview = useExplorerStore((s) => s.closePreview);

  const activePanel = useSidebarStore((s) => s.activePanel);
  const isPinned = useSidebarStore((s) => s.isPinned);
  const drawerOpen = useSidebarStore((s) => s.drawerOpen);
  const setDrawerOpen = useSidebarStore((s) => s.setDrawerOpen);
  const breakpoint = useSidebarStore((s) => s.breakpoint);

  const isMobile = breakpoint === "mobile";
  const isDesktop = breakpoint === "desktop";
  const sidebarIsDrawer = isMobile || !isPinned;
  const showSidebar = activePanel !== null && (isPinned || drawerOpen);
  const showDebug = isDesktop;

  const sidebarContent = activePanel === "explorer" ? (
    <ExplorerSidebar hideOuterShell />
  ) : activePanel === "git" ? (
    <GitPanel hideOuterShell />
  ) : activePanel === "search" ? (
    <SearchPanel />
  ) : activePanel === "rules" ? (
    <RulesPanel />
  ) : null;

  const centerTabs: { id: CenterTab; icon: typeof MessageSquare; label: string }[] = [
    { id: "chat", icon: MessageSquare, label: "Chat" },
    { id: "feed", icon: Rss, label: "Feed + Subs" },
    { id: "bash", icon: Terminal, label: "Bash" },
    { id: "todo", icon: ListTodo, label: "Todo" },
  ];

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden">
      {!isMobile && (
        <div className="h-8 bg-gray-800 flex items-center px-3 text-xs border-b border-gray-700 flex-shrink-0">
          <span className={`px-2 py-0.5 rounded flex items-center gap-1 ${mode === "desktop" ? "bg-green-600" : "bg-blue-600"}`}>
            {mode === "desktop" ? <Monitor className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
            {mode === "desktop" ? "Desktop (IPC)" : "Web (WebSocket)"}
          </span>
          <span className="ml-3 text-gray-400">Pi Agent</span>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        {!isMobile && <ActivityBar />}

        {showSidebar && isPinned && !isMobile && (
          <div className="bg-gray-850 border-r border-gray-700 flex flex-col flex-shrink-0 overflow-hidden relative"
            style={{ width: sidebarWidth }}>
            {sidebarContent}
            <div
              className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500/50 active:bg-indigo-500 transition-colors z-10 group"
              onMouseDown={handleResizeStart}
              style={{ width: 4, marginRight: -4 }}
            >
              <div className="absolute inset-y-0 left-1/2 w-0.5 bg-gray-700 group-hover:bg-indigo-400 transition-colors -translate-x-1/2" />
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div className="flex items-center bg-gray-800 border-b border-gray-700 flex-shrink-0">
            {centerTabs.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setCenterTab(id)}
                className={`flex items-center gap-1.5 px-4 py-1.5 text-xs border-b-2 transition-colors ${
                  centerTab === id
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {centerTab === "chat" && <ChatPanel />}
          {centerTab === "feed" && <FeedPanel />}
          {centerTab === "bash" && <BashPanel />}
          {centerTab === "todo" && <TodoPanel />}
          {filePreview && (
            <FilePreviewOverlay
              preview={filePreview}
              loading={loadingFile}
              onClose={closePreview}
            />
          )}
          <DiffViewerPanel />
        </div>

        {showDebug && <DebugPanel />}
      </div>

      {sidebarIsDrawer && showSidebar && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            style={isMobile ? { bottom: 56 } : undefined}
            onClick={() => setDrawerOpen(false)}
          />
          <div
            className="fixed left-0 top-0 w-60 z-50 bg-gray-850 border-r border-gray-700 flex flex-col overflow-hidden"
            style={isMobile ? { top: 0, bottom: 56 } : { top: 0, bottom: 0 }}
          >
            {sidebarContent}
          </div>
        </>
      )}

      {isMobile && <MobileTabBar />}
    </div>
  );
}
