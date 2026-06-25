/**
 * Browser Agent — 响应式三栏布局
 *
 * 断点策略（由 use-breakpoint.ts 自动控制）：
 * - wide (≥1280px)：侧栏固定 + 资源面板固定，中间对话区自适应
 * - desktop (1024-1279px)：侧栏固定，资源面板折叠为抽屉（右侧边栏按钮触发）
 * - tablet (768-1023px)：侧栏抽屉，资源面板抽屉
 * - mobile (<768px)：全部抽屉，默认收起
 *
 * 用户可手动切换（Pin 按钮 / TopBar 图标），覆盖自动行为。
 */

import { useTranslation } from "react-i18next";
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";
import { TopBar } from "../topbar/TopBar";
import { SkillSidebar } from "../sidebar/SkillSidebar";
import { SessionSidebar } from "../sidebar/SessionSidebar";
import { ChatPanel } from "../chat/ChatPanel";
import { AssetsPanel } from "../assets/AssetsPanel";
import { NetworkDrawer } from "../dev/NetworkPanel";
import { useSidebarStore, useAssetsPanelStore } from "../../stores/use-sidebar-store";
import { ProcessPanel } from "../process/ProcessPanel";

export type CenterTab = "chat" | "process";

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
	useTranslation();

	// 侧栏状态
	const sbBreakpoint = useSidebarStore((s) => s.breakpoint);
	const sbIsPinned = useSidebarStore((s) => s.isPinned);
	const sbDrawerOpen = useSidebarStore((s) => s.drawerOpen);
	const sbSetDrawerOpen = useSidebarStore((s) => s.setDrawerOpen);

	// 资源面板状态
	const apVisible = useAssetsPanelStore((s) => s.assetsVisible);
	const apDrawerOpen = useAssetsPanelStore((s) => s.assetsDrawerOpen);
	const apSetDrawerOpen = useAssetsPanelStore((s) => s.setAssetsDrawerOpen);

	// 侧栏：pinned 时固定占据空间；否则抽屉
	const sidebarPinned = sbIsPinned && sbBreakpoint !== "mobile";
	const sidebarShown = sidebarPinned || sbDrawerOpen;

	// 资源面板：visible 时固定占据空间；否则抽屉
	const assetsPinned = apVisible && sbBreakpoint === "wide";
	const assetsShown = assetsPinned || apDrawerOpen;

	return (
		<div className="h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] flex flex-col overflow-hidden">
			{/* 顶栏 */}
			<TopBar />

			<div className="flex-1 flex overflow-hidden relative">
				{/* ── 左：侧栏 ── */}
				{sidebarPinned ? (
					/* 固定模式 */
					<div
						className="bg-[var(--color-bg-sidebar)] border-r border-[var(--color-border-primary)] flex flex-col flex-shrink-0 overflow-hidden relative"
						style={{ width: sidebarWidth }}
					>
						<SidebarInner
							handleResizeStart={handleResizeStart}
							showClose={false}
						/>
					</div>
				) : sidebarShown ? (
					/* 抽屉模式：浮层 + 遮罩 */
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
								handleResizeStart={handleResizeStart}
								showClose={true}
								onClose={() => sbSetDrawerOpen(false)}
							/>
						</div>
					</>
				) : null}

				{/* ── 中：对话区（Tab 切换） ── */}
				<div className="flex-1 flex flex-col overflow-hidden min-w-0">
					{/* Tab 切换条 */}
					<div className="flex items-center gap-1 px-3 py-1 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border-primary)] flex-shrink-0">
						<TabButton active={centerTab === "chat"} onClick={() => setCenterTab("chat")} label="💬 会话" />
						<TabButton active={centerTab === "process"} onClick={() => setCenterTab("process")} label="⚙️ 加工" />
					</div>

					{/* Tab 内容 */}
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
	showClose,
	onClose,
}: {
	handleResizeStart: (e: React.MouseEvent) => void;
	showClose: boolean;
	onClose?: () => void;
}) {
	const sbSetPinned = useSidebarStore((s) => s.setPinned);
	const breakpoint = useSidebarStore((s) => s.breakpoint);

	return (
		<>
			{/* 抽屉头部（关闭/吸住按钮） */}
			{showClose && (
				<div className="flex items-center justify-end px-2 py-1.5 border-b border-[var(--color-border-secondary)]">
					{breakpoint !== "mobile" && (
						<button
							onClick={() => {
								sbSetPinned(true);
								onClose?.();
							}}
							title="固定侧栏"
							className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] p-1 mr-1"
						>
							<PanelLeftOpen className="w-4 h-4" />
						</button>
					)}
					<button
						onClick={onClose}
						title="关闭"
						className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] p-1"
					>
						<PanelLeftClose className="w-4 h-4" />
					</button>
				</div>
			)}

			<SkillSidebar />

			<div className="flex-1 overflow-auto">
				<SessionSidebar />
			</div>

			{/* 拖拽条（仅固定模式） */}
			{!showClose && (
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

// ===== 资源面板内容 =====

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

// ===== Tab 按钮 =====

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
	return (
		<button
			onClick={onClick}
			className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
				active
					? "bg-[var(--color-accent)]/15 text-[var(--color-text-accent)]"
					: "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
			}`}
		>
			{label}
		</button>
	);
}
