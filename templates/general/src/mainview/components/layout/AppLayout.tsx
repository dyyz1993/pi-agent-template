import { Wifi, Monitor, MessageSquare, Rss } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useConnectionStore } from "../../stores/use-connection-store";
import { useExplorerStore } from "../../stores/use-explorer-store";
import { useSidebarStore } from "../../stores/use-sidebar-store";
import { ActivityBar } from "../activity-bar/ActivityBar";
import { MobileTabBar } from "../activity-bar/MobileTabBar";
import { ExplorerSidebar } from "../explorer/ExplorerSidebar";
import { GitPanel } from "../git/GitPanel";
import { SearchPanel } from "../search/SearchPanel";
import { ChatPanel } from "../chat/ChatPanel";
import { FeedPanel } from "../feed/FeedPanel";
import { FilePreviewOverlay } from "../file-preview/FilePreviewOverlay";
import { DiffViewerPanel } from "../diff/DiffViewerPanel";
import { DebugPanel } from "../debug/DebugPanel";
import { ThemeToggle } from "../common/ThemeToggle";
import { LanguageSwitcher } from "../common/LanguageSwitcher";

export type CenterTab = "chat" | "feed";

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
	const scrollToLine = useExplorerStore((s) => s.scrollToLine);
	const clearScrollToLine = useExplorerStore((s) => s.clearScrollToLine);

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

	const sidebarContent =
		activePanel === "explorer" ? (
			<ExplorerSidebar hideOuterShell />
		) : activePanel === "git" ? (
			<GitPanel hideOuterShell />
		) : activePanel === "search" ? (
			<SearchPanel />
		) : activePanel === "chat" ? (
			<ChatPanel />
		) : activePanel === "feed" ? (
			<FeedPanel />
		) : activePanel === "debug" ? (
			<DebugPanel />
		) : null;

	const centerTabs: { id: CenterTab; icon: typeof MessageSquare; label: string }[] = [
		{ id: "chat", icon: MessageSquare, label: t("tabs.chat") },
		{ id: "feed", icon: Rss, label: t("tabs.feed") },
	];

	return (
		<div className="h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] flex flex-col overflow-hidden">
			{!isMobile && (
				<div className="h-8 bg-[var(--color-bg-secondary)] flex items-center px-3 text-xs border-b border-[var(--color-border-primary)] flex-shrink-0">
					<span
						className={`px-2 py-0.5 rounded flex items-center gap-1 ${mode === "desktop" ? "bg-green-600" : "bg-blue-600"}`}
					>
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
					<div
						className="bg-[var(--color-bg-primary)] border-r border-[var(--color-border-primary)] flex flex-col flex-shrink-0 overflow-hidden relative"
						style={{ width: sidebarWidth }}
					>
						{sidebarContent}
						<div
							className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize bg-[var(--color-border-primary)] hover:bg-indigo-500/50 active:bg-indigo-500 transition-colors z-10"
							onMouseDown={handleResizeStart}
						/>
					</div>
				)}

				<div className="flex-1 flex flex-col overflow-hidden relative">
					<div className="flex items-center bg-[var(--color-bg-secondary)] border-b border-[var(--color-border-primary)] flex-shrink-0">
						{centerTabs.map(({ id, icon: Icon, label }) => (
							<button
								key={id}
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

					{centerTab === "chat" ? <ChatPanel /> : <FeedPanel />}
					{filePreview && (
						<FilePreviewOverlay
							preview={filePreview}
							loading={loadingFile}
							onClose={closePreview}
							scrollToLine={scrollToLine ?? undefined}
							onScrolledToLine={clearScrollToLine}
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
