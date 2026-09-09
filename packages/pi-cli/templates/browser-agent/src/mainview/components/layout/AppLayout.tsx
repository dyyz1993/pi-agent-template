/**
 * Browser Agent — 响应式三栏布局
 *
 * 侧边栏三态折叠：full (展开) → icon (图标条) → hidden (隐藏)
 * TopBar 的侧栏按钮循环切换。移动端走抽屉模式。
 *
 * 断点策略（由 use-breakpoint.ts 自动控制）：
 * - wide (≥1280px)：侧栏固定 + 资源面板固定，中间对话区自适应
 * - desktop (1024-1279px)：侧栏固定，资源面板折叠为抽屉
 * - tablet (768-1023px)：侧栏抽屉，资源面板抽屉
 * - mobile (<768px)：全部抽屉，默认收起
 */

import { useTranslation } from "react-i18next";
import { PanelLeftClose, PanelRightClose, PanelRightOpen } from "lucide-react";
import { TopBar } from "../topbar/TopBar";
import { SkillSidebar } from "../sidebar/SkillSidebar";
import { SessionSidebar } from "../sidebar/SessionSidebar";
import { ChatPanel } from "../chat/ChatPanel";
import { AssetsPanel } from "../assets/AssetsPanel";
import { NetworkDrawer } from "../dev/NetworkPanel";
import { useSidebarStore, useAssetsPanelStore, SIDEBAR_ICON_WIDTH } from "../../stores/use-sidebar-store";
import { useViewStore } from "../../stores/use-view-store";
import { ProcessPanel } from "../process/ProcessPanel";

export type CenterTab = "chat" | "process";

interface AppLayoutProps {
	sidebarWidth: number;
	handleResizeStart: (e: React.MouseEvent) => void;
}

export function AppLayout({
	sidebarWidth,
	handleResizeStart,
}: AppLayoutProps) {
	useTranslation();

	// 视图 Tab（会话/加工）— 来自全局 store
	const centerTab = useViewStore((s) => s.activeView);
	const setCenterTab = useViewStore((s) => s.setActiveView);

	// 侧栏状态
	const sbBreakpoint = useSidebarStore((s) => s.breakpoint);
	const sbSidebarMode = useSidebarStore((s) => s.sidebarMode);
	const sbDrawerOpen = useSidebarStore((s) => s.drawerOpen);
	const sbSetDrawerOpen = useSidebarStore((s) => s.setDrawerOpen);

	// 资源面板状态
	const apVisible = useAssetsPanelStore((s) => s.assetsVisible);
	const apDrawerOpen = useAssetsPanelStore((s) => s.assetsDrawerOpen);
	const apSetDrawerOpen = useAssetsPanelStore((s) => s.setAssetsDrawerOpen);

	// 侧栏：full/icon 占据布局空间；hidden 不占
	const sidebarInLayout =
		(sbSidebarMode === "full" || sbSidebarMode === "icon") &&
		sbBreakpoint !== "mobile";
	// 移动端抽屉
	const sidebarDrawer = sbDrawerOpen && !sidebarInLayout;

	// 实际渲染宽度：icon 模式锁定 56px
	const effectiveWidth = sbSidebarMode === "icon" ? SIDEBAR_ICON_WIDTH : sidebarWidth;
	const isCollapsed = sbSidebarMode === "icon";

	// 资源面板：visible 时固定占据空间；否则抽屉
	const assetsPinned = apVisible && sbBreakpoint === "wide";
	const assetsShown = assetsPinned || apDrawerOpen;

	return (
		<div className="h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] flex flex-col overflow-hidden">
			{/* 顶栏 */}
			<TopBar />

			<div className="flex-1 flex overflow-hidden relative">
				{/* ── 左：侧栏 ── */}
				{sidebarInLayout ? (
					/* 固定模式（full 或 icon） */
					<div
						className="sidebar-container bg-[var(--color-bg-sidebar)] border-r border-[var(--color-border-primary)] flex flex-col flex-shrink-0 overflow-hidden relative"
						style={{ width: effectiveWidth }}
					>
						<SidebarInner
							handleResizeStart={handleResizeStart}
							isCollapsed={isCollapsed}
							centerTab={centerTab}
							setCenterTab={setCenterTab}
						/>
					</div>
				) : sidebarDrawer ? (
					/* 抽屉模式：浮层 + 遮罩（移动端） */
					<>
						<div
							className="absolute inset-0 bg-black/40 z-20"
							onClick={() => sbSetDrawerOpen(false)}
						/>
						<div
							className="absolute top-0 left-0 bottom-0 bg-[var(--color-bg-sidebar)] border-r border-[var(--color-border-primary)] flex flex-col z-30 shadow-xl"
							style={{ width: sidebarWidth }}
						>
							<SidebarInner
								isCollapsed={false}
								showClose={true}
								onClose={() => sbSetDrawerOpen(false)}
								centerTab={centerTab}
								setCenterTab={setCenterTab}
							/>
						</div>
					</>
				) : null}

				{/* ── 中：对话区 ── */}
				<div className="flex-1 flex flex-col overflow-hidden min-w-0">
					{centerTab === "chat" ? <ChatPanel /> : <ProcessPanel />}
				</div>

				{/* ── 右：资源面板 ── */}
				{assetsPinned ? (
					/* 固定模式 */
					<div className="bg-[var(--color-bg-secondary)] border-l border-[var(--color-border-primary)] flex flex-col flex-shrink-0 overflow-hidden w-[300px]">
						<AssetsInner showClose={false} />
					</div>
				) : assetsShown ? (
					/* 抽屉模式 */
					<>
						<div
							className="absolute inset-0 bg-black/40 z-20"
							onClick={() => apSetDrawerOpen(false)}
						/>
						<div className="absolute top-0 right-0 bottom-0 bg-[var(--color-bg-secondary)] border-l border-[var(--color-border-primary)] flex flex-col z-30 shadow-xl w-[300px]">
							<AssetsInner
								showClose={true}
								onClose={() => apSetDrawerOpen(false)}
							/>
						</div>
					</>
				) : null}

				{/* ── 右侧边缘：资源面板触发条（抽屉模式时显示） ── */}
				{!assetsPinned && !apDrawerOpen && (
					<button
						onClick={() => apSetDrawerOpen(true)}
						title="打开资源面板"
						className="absolute top-1/2 right-0 -translate-y-1/2 z-10 px-1 py-3 bg-[var(--color-bg-secondary)] border border-r-0 border-[var(--color-border-primary)] rounded-l-lg hover:bg-[var(--color-bg-hover)] transition-colors"
					>
						<PanelRightOpen className="w-4 h-4 text-[var(--color-text-tertiary)]" />
					</button>
				)}
			</div>

			{/* 网络通讯面板（底部抽屉） */}
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
	centerTab,
	setCenterTab,
}: {
	handleResizeStart?: (e: React.MouseEvent) => void;
	isCollapsed: boolean;
	showClose?: boolean;
	onClose?: () => void;
	centerTab: CenterTab;
	setCenterTab: (tab: CenterTab) => void;
}) {
	return (
		<>
			{/* 抽屉头部（关闭按钮，仅移动端抽屉模式） */}
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

			{/* Tab 切换（会话/加工） */}
			<div className={`flex items-center gap-0.5 border-b border-[var(--color-border-secondary)] ${isCollapsed ? "flex-col py-2" : "px-2 py-1.5"}`}>
				<SidebarTab
					active={centerTab === "chat"}
					onClick={() => setCenterTab("chat")}
					label="会话"
					icon="💬"
					collapsed={isCollapsed}
				/>
				<SidebarTab
					active={centerTab === "process"}
					onClick={() => setCenterTab("process")}
					label="加工"
					icon="⚙️"
					collapsed={isCollapsed}
				/>
			</div>

			{/* 技能库 */}
			{!isCollapsed && <SkillSidebar />}
			{isCollapsed && <SkillSidebar collapsed />}

			{/* 会话列表 */}
			<div className={isCollapsed ? "flex-1 overflow-hidden" : "flex-1 overflow-auto"}>
				<SessionSidebar collapsed={isCollapsed} />
			</div>

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

function AssetsInner({
	showClose,
	onClose,
}: {
	showClose: boolean;
	onClose?: () => void;
}) {
	const apSetVisible = useAssetsPanelStore((s) => s.setAssetsVisible);
	const breakpoint = useSidebarStore((s) => s.breakpoint);

	return (
		<>
			{showClose && (
				<div className="flex items-center justify-end px-2 py-1.5 border-b border-[var(--color-border-secondary)]">
					{breakpoint === "wide" && (
						<button
							onClick={() => {
								apSetVisible(true);
								onClose?.();
							}}
							title="固定资源面板"
							className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] p-1 mr-1"
						>
							<PanelRightOpen className="w-4 h-4" />
						</button>
					)}
					<button
						onClick={onClose}
						title="关闭"
						className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] p-1"
					>
						<PanelRightClose className="w-4 h-4" />
					</button>
				</div>
			)}
			<AssetsPanel />
		</>
	);
}

// ===== 侧边栏 Tab 按钮 =====

function SidebarTab({
	active,
	onClick,
	label,
	icon,
	collapsed,
}: {
	active: boolean;
	onClick: () => void;
	label: string;
	icon: string;
	collapsed: boolean;
}) {
	if (collapsed) {
		return (
			<button
				onClick={onClick}
				title={label}
				className={`flex-1 flex items-center justify-center py-2 text-lg rounded-md transition-colors ${
					active
						? "bg-[var(--color-accent)]/15"
						: "hover:bg-[var(--color-bg-hover)]"
				}`}
			>
				{icon}
			</button>
		);
	}
	return (
		<button
			onClick={onClick}
			className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
				active
					? "bg-[var(--color-accent)]/15 text-[var(--color-text-accent)]"
					: "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
			}`}
		>
			{label}
		</button>
	);
}
