/**
 * Cowork — 响应式三栏布局
 *
 * 核心交互：Tab 切换驱动中间内容区
 * - Chat: 纯聊天界面
 * - Code: 内嵌浏览器预览
 * - Cowork: 任务协作界面
 */
import { useTranslation } from 'react-i18next';
import { PanelLeftClose } from 'lucide-react';
import { TopBar } from '../topbar/TopBar';
import { TaskSidebar } from '../sidebar/TaskSidebar';
import { TaskChat } from '../chat/TaskChat';
import { CodeView } from '../code/CodeView';
import { ProgressPanel } from '../right/ProgressPanel';
import { ArtifactsPanel } from '../right/ArtifactsPanel';
import { ContextPanel } from '../right/ContextPanel';
import { PreviewBlock } from '../right/PreviewBlock';
import { NetworkDrawer } from '../dev/NetworkPanel';
import { useSidebarStore, SIDEBAR_ICON_WIDTH } from '../../stores/use-sidebar-store';
import { useViewStore } from '../../stores/use-view-store';

interface AppLayoutProps {
	sidebarWidth: number;
	handleResizeStart: (e: React.MouseEvent) => void;
}

export function AppLayout({ sidebarWidth, handleResizeStart }: AppLayoutProps) {
	useTranslation();

	// 侧栏状态
	const sbBreakpoint = useSidebarStore((s) => s.breakpoint);
	const sbSidebarMode = useSidebarStore((s) => s.sidebarMode);
	const sbDrawerOpen = useSidebarStore((s) => s.drawerOpen);
	const sbSetDrawerOpen = useSidebarStore((s) => s.setDrawerOpen);

	// 视图 Tab — 驱动中间内容切换
	const centerTab = useViewStore((s) => s.centerTab);

	// 侧栏：full/icon 占据布局空间
	const sidebarInLayout =
		(sbSidebarMode === 'full' || sbSidebarMode === 'icon') && sbBreakpoint !== 'mobile';
	const sidebarDrawer = sbDrawerOpen && !sidebarInLayout;
	const effectiveWidth = sbSidebarMode === 'icon' ? SIDEBAR_ICON_WIDTH : sidebarWidth;
	const isCollapsed = sbSidebarMode === 'icon';

	// 右侧面板（Cowork 固定显示）
	const showRightPanel = sbBreakpoint !== 'mobile';

	return (
		<div className="h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] flex flex-col overflow-hidden">
			<TopBar />

			<div className="flex-1 flex overflow-hidden relative">
				{/* ── 左：任务侧栏 ── */}
				{sidebarInLayout ? (
					<div
						className="sidebar-container bg-[var(--color-bg-sidebar)] border-r border-[var(--color-border-primary)] flex flex-col flex-shrink-0 overflow-hidden relative"
						style={{ width: effectiveWidth }}
					>
						<SidebarInner handleResizeStart={handleResizeStart} isCollapsed={isCollapsed} />
					</div>
				) : sidebarDrawer ? (
					<>
						<div
							className="absolute inset-0 bg-black/40 z-20"
							onClick={() => sbSetDrawerOpen(false)}
						/>
						<div
							className="absolute top-0 left-0 bottom-0 bg-[var(--color-bg-sidebar)] border-r border-[var(--color-border-primary)] flex flex-col z-30 shadow-xl"
							style={{ width: sidebarWidth }}
						>
							<SidebarInner isCollapsed={false} showClose onClose={() => sbSetDrawerOpen(false)} />
						</div>
					</>
				) : null}

				{/* ── 中：根据 Tab 切换内容 ── */}
				<div className="flex-1 flex flex-col overflow-hidden min-w-0">
					{centerTab === 'chat' && <ChatView />}
					{centerTab === 'code' && <CodeView />}
					{centerTab === 'cowork' && <TaskChat />}
				</div>

				{/* ── 右：根据 Tab 显示不同内容 ── */}
				{showRightPanel && centerTab === 'cowork' && (
					<div className="w-[300px] bg-[var(--color-bg-panel)] border-l border-[var(--color-border-primary)] flex flex-col flex-shrink-0 overflow-auto">
						<ProgressPanel />
						<ArtifactsPanel />
						<ContextPanel />
					</div>
				)}
				{showRightPanel && centerTab === 'code' && (
					<div className="w-[300px] bg-[var(--color-bg-panel)] border-l border-[var(--color-border-primary)] flex flex-col flex-shrink-0 overflow-auto">
						<ProgressPanel />
						<ArtifactsPanel />
						<PreviewBlock />
					</div>
				)}
			</div>

			<NetworkDrawer />
		</div>
	);
}

// ===== Chat 视图 =====
function ChatView() {
	return (
		<div className="flex-1 flex flex-col items-center justify-center text-[var(--color-text-tertiary)]">
			<div className="text-center">
				<p className="text-lg mb-2">Chat 模式</p>
				<p className="text-sm">纯对话界面，无任务管理</p>
			</div>
		</div>
	);
}

// ===== Code 视图（导入自 components/code/CodeView） =====

// ===== 侧栏内容 =====
function SidebarInner({
	handleResizeStart,
	isCollapsed,
	showClose,
	onClose,
}: {
	handleResizeStart?: (e: React.MouseEvent) => void;
	isCollapsed: boolean;
	showClose?: boolean;
	onClose?: () => void;
}) {
	return (
		<>
			{showClose && (
				<div className="flex items-center justify-end px-2 py-1.5 border-b border-[var(--color-border-secondary)]">
					<button
						onClick={onClose}
						title="关闭"
						className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] p-1"
					>
						<PanelLeftClose className="w-4 h-4" />
					</button>
				</div>
			)}

			{/* 任务列表（包含 Tab 切换） */}
			{isCollapsed ? <TaskSidebar collapsed /> : <TaskSidebar />}

			{/* 拖拽条（仅完整模式） */}
			{!showClose && !isCollapsed && handleResizeStart && (
				<div
					className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[var(--color-accent)]/50 active:bg-[var(--color-accent)] transition-colors z-10 group"
					onMouseDown={handleResizeStart}
					style={{ width: 4, marginRight: -4 }}
				>
					<div className="absolute inset-y-0 left-1/2 w-0.5 bg-[var(--color-border-primary)] group-hover:bg-[var(--color-text-accent)] transition-colors -translate-x-1/2" />
				</div>
			)}
		</>
	);
}
