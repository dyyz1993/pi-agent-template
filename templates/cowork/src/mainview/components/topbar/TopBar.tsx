/**
 * 顶栏 — Claude Cowork 风格
 *
 * 左侧：侧栏 toggle + Cowork logo
 * 右侧：用户头像（MVP 用占位）
 */
import { PanelLeft, PanelLeftOpen } from 'lucide-react';
import { useSidebarStore } from '../../stores/use-sidebar-store';

export function TopBar() {
	// 侧栏状态
	const sbSidebarMode = useSidebarStore((s) => s.sidebarMode);
	const sbCycleMode = useSidebarStore((s) => s.cycleSidebarMode);
	const sbDrawerOpen = useSidebarStore((s) => s.drawerOpen);
	const sbSetDrawerOpen = useSidebarStore((s) => s.setDrawerOpen);
	const sbBreakpoint = useSidebarStore((s) => s.breakpoint);

	const sidebarActive = sbSidebarMode !== 'hidden' || sbDrawerOpen;

	const handleSidebarToggle = (): void => {
		if (sbBreakpoint === 'mobile' || sbBreakpoint === 'tablet') {
			sbSetDrawerOpen(!sbDrawerOpen);
		} else {
			sbCycleMode();
		}
	};

	return (
		<div className="h-11 flex items-center justify-between px-3 bg-[var(--color-bg-primary)] border-b border-[var(--color-border-secondary)] flex-shrink-0 z-10">
			{/* 左侧：侧栏 toggle + Logo */}
			<div className="flex items-center gap-2.5">
				<button
					onClick={handleSidebarToggle}
					title={
						sbBreakpoint === 'mobile' || sbBreakpoint === 'tablet'
							? sbDrawerOpen
								? '收起侧栏'
								: '展开侧栏'
							: sbSidebarMode === 'full'
								? '折叠为图标条'
								: sbSidebarMode === 'icon'
									? '完全隐藏侧栏'
									: '展开侧栏'
					}
					className={`p-1.5 rounded-lg transition-colors ${
						sidebarActive
							? 'text-[var(--color-text-accent)] bg-[var(--color-accent)]/10'
							: 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'
					}`}
				>
					{sbSidebarMode === 'hidden' && !sbDrawerOpen ? (
						<PanelLeftOpen className="w-[18px] h-[18px] pointer-events-none" />
					) : (
						<PanelLeft className="w-[18px] h-[18px] pointer-events-none" />
					)}
				</button>

				{/* Cowork Logo */}
				<div className="flex items-center gap-1.5">
					<div className="w-6 h-6 rounded-md bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center">
						<span className="text-white text-xs font-bold">C</span>
					</div>
					<span className="text-sm font-semibold text-[var(--color-text-primary)]">Cowork</span>
				</div>
			</div>

			{/* 右侧：用户头像 */}
			<div className="flex items-center gap-2">
				<div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
					SW
				</div>
			</div>
		</div>
	);
}
