import React, { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Wifi, Monitor, MessageSquare, Rss, Terminal, ListTodo } from "lucide-react";
import { useConnectionStore } from "../../stores/use-connection-store";
import { useExplorerStore } from "../../stores/use-explorer-store";
import { useSidebarStore } from "../../stores/use-sidebar-store";
import { ActivityBar } from "../activity-bar/ActivityBar";
import { MobileTabBar } from "../activity-bar/MobileTabBar";
import { ExplorerSidebar } from "../explorer/ExplorerSidebar";
import { ChatPanel } from "../chat/ChatPanel";
import { ThemeToggle } from "../common/ThemeToggle";
import { LanguageSwitcher } from "../common/LanguageSwitcher";

const GitPanel = React.lazy(() => import("../git/GitPanel").then((m) => ({ default: m.GitPanel })));
const SearchPanel = React.lazy(() => import("../search/SearchPanel").then((m) => ({ default: m.SearchPanel })));
const RulesPanel = React.lazy(() => import("../rules/RulesPanel").then((m) => ({ default: m.RulesPanel })));
const FeedPanel = React.lazy(() => import("../feed/FeedPanel").then((m) => ({ default: m.FeedPanel })));
const BashPanel = React.lazy(() => import("../bash/BashPanel").then((m) => ({ default: m.BashPanel })));
const TodoPanel = React.lazy(() => import("../todo/TodoPanel").then((m) => ({ default: m.TodoPanel })));
const FilePreviewOverlay = React.lazy(() => import("../file-preview/FilePreviewOverlay").then((m) => ({ default: m.FilePreviewOverlay })));
const DiffViewerPanel = React.lazy(() => import("../diff/DiffViewerPanel").then((m) => ({ default: m.DiffViewerPanel })));
const DebugPanel = React.lazy(() => import("../debug/DebugPanel").then((m) => ({ default: m.DebugPanel })));

function PanelFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-pulse text-[var(--color-text-tertiary)] text-sm">Loading...</div>
    </div>
  );
}

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
  const { t } = useTranslation();
  const mode = useConnectionStore((s) => s.mode);
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
    <Suspense fallback={<PanelFallback />}><GitPanel hideOuterShell /></Suspense>
  ) : activePanel === "search" ? (
    <Suspense fallback={<PanelFallback />}><SearchPanel /></Suspense>
  ) : activePanel === "rules" ? (
    <Suspense fallback={<PanelFallback />}><RulesPanel /></Suspense>
  ) : null;

  const centerTabs: { id: CenterTab; icon: typeof MessageSquare; label: string }[] = [
    { id: "chat", icon: MessageSquare, label: t("tabs.chat") },
    { id: "feed", icon: Rss, label: t("tabs.feed") },
    { id: "bash", icon: Terminal, label: t("tabs.bash") },
    { id: "todo", icon: ListTodo, label: t("tabs.todo") },
  ];

  return (
    <div className="h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] flex flex-col overflow-hidden">
      {!isMobile && (
        <div className="h-8 bg-[var(--color-bg-secondary)] flex items-center px-3 text-xs border-b border-[var(--color-border-primary)] flex-shrink-0">
          <span className={`px-2 py-0.5 rounded flex items-center gap-1 ${mode === "desktop" ? "bg-green-600" : "bg-blue-600"}`}>
            {mode === "desktop" ? <Monitor className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
            {mode === "desktop" ? t("app.mode.desktop") : t("app.mode.web")}
          </span>
          <span className="ml-3 text-[var(--color-text-tertiary)]">{t("app.title")}</span>
          <div className="ml-auto flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        {!isMobile && <ActivityBar />}

        {showSidebar && isPinned && !isMobile && (
          <div className="bg-[var(--color-bg-primary)] border-r border-[var(--color-border-primary)] flex flex-col flex-shrink-0 overflow-hidden relative"
            style={{ width: sidebarWidth }}>
            {sidebarContent}
            <div
              className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500/50 active:bg-indigo-500 transition-colors z-10 group"
              onMouseDown={handleResizeStart}
              style={{ width: 4, marginRight: -4 }}
            >
              <div className="absolute inset-y-0 left-1/2 w-0.5 bg-[var(--color-border-primary)] group-hover:bg-[var(--color-text-accent)] transition-colors -translate-x-1/2" />
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div className="flex items-center bg-[var(--color-bg-secondary)] border-b border-[var(--color-border-primary)] flex-shrink-0">
            {centerTabs.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                data-testid={`center-tab-${id}`}
                onClick={() => setCenterTab(id)}
                className={`flex items-center gap-1.5 px-4 py-1.5 text-xs border-b-2 transition-colors ${
                  centerTab === id
                    ? "border-[var(--color-accent)] text-[var(--color-text-primary)]"
                    : "border-transparent text-[var(--color-text-placeholder)] hover:text-[var(--color-text-secondary)]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {centerTab === "chat" && <ChatPanel />}
          {centerTab === "feed" && <Suspense fallback={<PanelFallback />}><FeedPanel /></Suspense>}
          {centerTab === "bash" && <Suspense fallback={<PanelFallback />}><BashPanel /></Suspense>}
          {centerTab === "todo" && <Suspense fallback={<PanelFallback />}><TodoPanel /></Suspense>}
          {filePreview && (
            <Suspense fallback={<PanelFallback />}>
              <FilePreviewOverlay
                preview={filePreview}
                loading={loadingFile}
                onClose={closePreview}
              />
            </Suspense>
          )}
          <Suspense fallback={null}><DiffViewerPanel /></Suspense>
        </div>

        {showDebug && <Suspense fallback={<PanelFallback />}><DebugPanel /></Suspense>}
      </div>

      {sidebarIsDrawer && showSidebar && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            style={isMobile ? { bottom: 56 } : undefined}
            onClick={() => setDrawerOpen(false)}
          />
          <div
            className="fixed left-0 top-0 w-60 z-50 bg-[var(--color-bg-primary)] border-r border-[var(--color-border-primary)] flex flex-col overflow-hidden"
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
