/**
 * 顶栏 — 侧栏 toggle + Logo + 右栏 toggle + 用户头像
 */
import { PanelLeft, PanelLeftOpen, PanelRight, PanelRightOpen } from 'lucide-react';
import { useSidebarStore, useRightPanelStore } from '../../stores/use-sidebar-store';
import { useViewStore } from '../../stores/use-view-store';

export function TopBar() {
	// 左栏
	const sbSidebarMode = useSidebarStore((s) => s.sidebarMode);
	const sbCycleMode = useSidebarStore((s) => s.cycleSidebarMode);
	const sbDrawerOpen = useSidebarStore((s) => s.drawerOpen);
	const sbSetDrawerOpen = useSidebarStore((s) => s.setDrawerOpen);
	const sbBreakpoint = useSidebarStore((s) => s.breakpoint);
	const sidebarActive = sbSidebarMode !== 'hidden' || sbDrawerOpen;

	// 右栏
	const rpMode = useRightPanelStore((s) => s.mode);
	const rpToggle = useRightPanelStore((s) => s.toggleMode);
	const centerTab = useViewStore((s) => s.centerTab);
	const rightPanelToggleable = centerTab !== 'chat' && sbBreakpoint !== 'mobile';

	const handleSidebarToggle = (): void => {
		if (sbBreakpoint === 'mobile' || sbBreakpoint === 'tablet') {
			sbSetDrawerOpen(!sbDrawerOpen);
		} else {
			sbCycleMode();
		}
	};

	return (
		<div className="h-11 flex items-center justify-between px-3 bg-[var(--color-bg-primary)] border-b border-[var(--color-border-secondary)] flex-shrink-0 z-10">
			<div className="flex items-center gap-2.5">
				{/* 左栏 toggle */}
				<button
					onClick={handleSidebarToggle}
					title={sbSidebarMode === 'hidden' && !sbDrawerOpen ? '展开侧栏' : '收起侧栏'}
					className={`p-1.5 rounded-lg transition-colors ${
						sidebarActive
							? 'text-[var(--color-text-accent)] bg-[var(--color-accent)]/10'
							: 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'
					}`}
				>
					{sbSidebarMode === 'hidden' && !sbDrawerOpen ? (
						<PanelLeftOpen className="w-[18px] h-[18px]" />
					) : (
						<PanelLeft className="w-[18px] h-[18px]" />
					)}
				</button>

				<div className="flex items-center gap-1.5">
					<div className="w-6 h-6 rounded-md bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center">
						<span className="text-white text-xs font-bold">C</span>
					</div>
					<span className="text-sm font-semibold text-[var(--color-text-primary)]">Cowork</span>
				</div>
			</div>

			{/* 右侧 */}
			<div className="flex items-center gap-2">
				{/* 右栏 toggle（Chat 模式下隐藏） */}
				{rightPanelToggleable && (
					<button
						onClick={rpToggle}
						title={rpMode === 'full' ? '收起右侧面板' : '展开右侧面板'}
						className={`p-1.5 rounded-lg transition-colors ${
							rpMode === 'full'
								? 'text-[var(--color-text-accent)] bg-[var(--color-accent)]/10'
								: 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'
						}`}
					>
						{rpMode === 'hidden' ? (
							<PanelRightOpen className="w-[18px] h-[18px]" />
						) : (
							<PanelRight className="w-[18px] h-[18px]" />
						)}
					</button>
				)}

				<div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
					SW
				</div>
			</div>
		</div>
	);
}
