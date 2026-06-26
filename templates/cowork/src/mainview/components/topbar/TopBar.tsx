/**
 * 顶栏 — Logo、连接状态、侧栏切换
 */
// TopBar for Cowork template
import { Wifi, WifiOff, PanelLeft, PanelLeftOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useConnectionStore } from "../../stores/use-connection-store";
import { useSidebarStore } from "../../stores/use-sidebar-store";
import { ThemeToggle } from "../common/ThemeToggle";
import { LanguageSwitcher } from "../common/LanguageSwitcher";

export function TopBar() {
	useTranslation();
	const mode = useConnectionStore((s) => s.mode);
	const browserStatus = useConnectionStore((s) => s.browserStatus);
	const isOnline = browserStatus === "online";

	// 侧栏状态
	const sbSidebarMode = useSidebarStore((s) => s.sidebarMode);
	const sbCycleMode = useSidebarStore((s) => s.cycleSidebarMode);
	const sbDrawerOpen = useSidebarStore((s) => s.drawerOpen);
	const sbSetDrawerOpen = useSidebarStore((s) => s.setDrawerOpen);
	const sbBreakpoint = useSidebarStore((s) => s.breakpoint);

	const sidebarActive = sbSidebarMode !== "hidden" || sbDrawerOpen;

	const handleSidebarToggle = (): void => {
		if (sbBreakpoint === "mobile" || sbBreakpoint === "tablet") {
			sbSetDrawerOpen(!sbDrawerOpen);
		} else {
			sbCycleMode();
		}
	};

	return (
		<div className="h-10 flex items-center justify-between px-3 bg-[var(--color-bg-primary)] border-b border-[var(--color-border-secondary)] flex-shrink-0 z-10">
			{/* 左侧：侧栏切换 + Logo */}
			<div className="flex items-center gap-2">
				<button
					onClick={handleSidebarToggle}
					title={
						sbBreakpoint === "mobile" || sbBreakpoint === "tablet"
							? sbDrawerOpen ? "收起侧栏" : "展开侧栏"
							: sbSidebarMode === "full" ? "折叠为图标条"
							: sbSidebarMode === "icon" ? "完全隐藏侧栏"
							: "展开侧栏"
					}
					className={`text-[var(--color-text-placeholder)] hover:text-[var(--color-text-primary)] transition-colors p-1 rounded hover:bg-[var(--color-bg-hover)] ${
						sidebarActive ? "text-[var(--color-text-accent)]" : ""
					}`}
				>
					{sbSidebarMode === "hidden" && !sbDrawerOpen ? (
						<PanelLeftOpen className="w-4 h-4" />
					) : (
						<PanelLeft className="w-4 h-4" />
					)}
				</button>
				<div className="flex items-center gap-1.5">
					<div className="w-5 h-5 rounded bg-gradient-to-br from-[var(--color-accent)] to-purple-500" />
					<span className="text-sm font-semibold text-[var(--color-text-primary)]">Cowork</span>
					<span className="text-xs text-[var(--color-text-tertiary)]">v0.1.0</span>
				</div>
			</div>

			{/* 右侧：连接状态 + 工具 */}
			<div className="flex items-center gap-2">
				<div className="flex items-center gap-1 px-2 py-1 rounded bg-[var(--color-bg-secondary)]">
					{isOnline ? (
						<Wifi className="w-3.5 h-3.5 text-green-500" />
					) : (
						<WifiOff className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
					)}
					<span className="text-xs text-[var(--color-text-secondary)]">
						{mode === "desktop" ? "Desktop" : isOnline ? "Online" : "Offline"}
					</span>
				</div>
				<LanguageSwitcher />
				<ThemeToggle />
			</div>
		</div>
	);
}
