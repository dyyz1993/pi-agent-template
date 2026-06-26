/**
 * Cowork — 响应式三栏布局
 *
 * 核心设计：
 * - 中间区域永远是聊天内容（所有 Tab 共享）
 * - 左栏：任务列表（三态折叠 full/icon/hidden）
 * - 右栏：按 Tab 切换内容（Cowork=Progress+Artifacts+Context / Code=Preview浏览器）
 *   可拖拽调宽 + 可收起
 */
import { useTranslation } from 'react-i18next';
import { PanelLeftClose } from 'lucide-react';
import { TopBar } from '../topbar/TopBar';
import { TaskSidebar } from '../sidebar/TaskSidebar';
import { TaskChat } from '../chat/TaskChat';
import { ProgressPanel } from '../right/ProgressPanel';
import { ArtifactsPanel } from '../right/ArtifactsPanel';
import { ContextPanel } from '../right/ContextPanel';
import { PreviewBlock } from '../right/PreviewBlock';
import { NetworkDrawer } from '../dev/NetworkPanel';
import { useSidebarStore, SIDEBAR_ICON_WIDTH } from '../../stores/use-sidebar-store';
import { useRightPanelStore } from '../../stores/use-sidebar-store';
import { useViewStore } from '../../stores/use-view-store';

interface AppLayoutProps {
	sidebarWidth: number;
	handleResizeStart: (e: React.MouseEvent) => void;
}

export function AppLayout({ sidebarWidth, handleResizeStart }: AppLayoutProps) {
	useTranslation();

	// 左栏状态
	const sbBreakpoint = useSidebarStore((s) => s.breakpoint);
	const sbSidebarMode = useSidebarStore((s) => s.sidebarMode);
	const sbDrawerOpen = useSidebarStore((s) => s.drawerOpen);
	const sbSetDrawerOpen = useSidebarStore((s) => s.setDrawerOpen);

	// 右栏状态
	const rpWidth = useRightPanelStore((s) => s.width);
	const rpMode = useRightPanelStore((s) => s.mode);
	const rpSetWidth = useRightPanelStore((s) => s.setWidth);

	// 视图 Tab
	const centerTab = useViewStore((s) => s.centerTab);

	// 左栏派生
	const sidebarInLayout =
		(sbSidebarMode === 'full' || sbSidebarMode === 'icon') && sbBreakpoint !== 'mobile';
	const sidebarDrawer = sbDrawerOpen && !sidebarInLayout;
	const effectiveSidebarWidth = sbSidebarMode === 'icon' ? SIDEBAR_ICON_WIDTH : sidebarWidth;
	const isSidebarCollapsed = sbSidebarMode === 'icon';

	// 右栏派生：Chat 模式自动隐藏，其他模式看 rpMode
	const rightPanelVisible = rpMode === 'full' && centerTab !== 'chat' && sbBreakpoint !== 'mobile';

	// 右栏拖拽
	const handleRightResizeStart = (e: React.MouseEvent) => {
		e.preventDefault();
		const startX = e.clientX;
		const startWidth = rpWidth;
		document.body.style.cursor = 'col-resize';
		document.body.style.userSelect = 'none';

		const onMove = (ev: MouseEvent) => {
			// 右栏在右侧，拖拽方向相反（往左拖 = 加宽）
			const delta = startX - ev.clientX;
			rpSetWidth(startWidth + delta);
		};
		const onUp = () => {
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
			window.removeEventListener('mousemove', onMove);
			window.removeEventListener('mouseup', onUp);
		};
		window.addEventListener('mousemove', onMove);
		window.addEventListener('mouseup', onUp);
	};

	return (
		<div className="h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] flex flex-col overflow-hidden">
			<TopBar />

			<div className="flex-1 flex overflow-hidden relative">
				{/* ── 左：任务侧栏 ── */}
				{sidebarInLayout ? (
					<div
						className="sidebar-container bg-[var(--color-bg-sidebar)] border-r border-[var(--color-border-primary)] flex flex-col flex-shrink-0 overflow-hidden relative"
						style={{ width: effectiveSidebarWidth }}
					>
						<SidebarInner handleResizeStart={handleResizeStart} isCollapsed={isSidebarCollapsed} />
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

				{/* ── 中：聊天（所有 Tab 共享） ── */}
				<div className="flex-1 flex flex-col overflow-hidden min-w-0">
					<TaskChat />
				</div>

				{/* ── 右：按 Tab 切换内容 ── */}
				{rightPanelVisible && (
					<div
						className="bg-[var(--color-bg-panel)] border-l border-[var(--color-border-primary)] flex flex-col flex-shrink-0 overflow-hidden relative"
						style={{ width: rpWidth }}
					>
						{centerTab === 'cowork' && (
							<div className="flex-1 overflow-auto">
								<ProgressPanel />
								<ArtifactsPanel />
								<ContextPanel />
							</div>
						)}
						{centerTab === 'code' && (
							<div className="flex-1 flex flex-col overflow-hidden">
								<PreviewBlock />
							</div>
						)}

						{/* 右栏拖拽条 */}
						<div
							className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[var(--color-accent)]/50 active:bg-[var(--color-accent)] transition-colors z-10 group"
							onMouseDown={handleRightResizeStart}
							style={{ width: 4, marginLeft: -4 }}
						>
							<div className="absolute inset-y-0 left-1/2 w-0.5 bg-[var(--color-border-primary)] group-hover:bg-[var(--color-text-accent)] transition-colors -translate-x-1/2" />
						</div>
					</div>
				)}

				{/* 右栏收起时的展开按钮 */}
				{!rightPanelVisible && centerTab !== 'chat' && sbBreakpoint !== 'mobile' && (
					<button
						onClick={() => useRightPanelStore.getState().setMode('full')}
						title="展开右侧面板"
						className="absolute top-1/2 right-0 -translate-y-1/2 z-10 px-1 py-4 bg-[var(--color-bg-panel)] border border-r-0 border-[var(--color-border-primary)] rounded-l-lg hover:bg-[var(--color-bg-hover)] transition-colors"
					>
						<span className="text-[var(--color-text-tertiary)] text-xs">◀</span>
					</button>
				)}
			</div>

			<NetworkDrawer />
		</div>
	);
}

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

			{isCollapsed ? <TaskSidebar collapsed /> : <TaskSidebar />}

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
