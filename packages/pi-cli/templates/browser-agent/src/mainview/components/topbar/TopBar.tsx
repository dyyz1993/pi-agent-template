/**
 * 顶栏 — Logo、连接状态、标签页选择器、插件、版本号
 *
 * 对应 PRD §5.2 Topbar 职责
 */

import { useState, useEffect, useRef } from "react";
import { Monitor, Wifi, WifiOff, ChevronDown, RefreshCw, Globe, Puzzle, PanelLeft, PanelLeftOpen, PanelRight, Circle, Square } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useConnectionStore } from "../../stores/use-connection-store";
import { useSidebarStore, useAssetsPanelStore } from "../../stores/use-sidebar-store";
import { ThemeToggle } from "../common/ThemeToggle";
import { LanguageSwitcher } from "../common/LanguageSwitcher";
import { NetworkToggleButton } from "../dev/NetworkPanel";
import { SetupWizard } from "../onboarding/SetupWizard";
import { useRecordStore } from "../../stores/use-record-store";
import { useViewStore } from "../../stores/use-view-store";

export function TopBar() {
	const { t } = useTranslation();
	const mode = useConnectionStore((s) => s.mode);
	const browserStatus = useConnectionStore((s) => s.browserStatus);
	const tabs = useConnectionStore((s) => s.tabs);
	const selectedTabIndex = useConnectionStore((s) => s.selectedTabIndex);
	const activeTabIndex = useConnectionStore((s) => s.activeTabIndex);
	const selectTab = useConnectionStore((s) => s.selectTab);
	const loadTabs = useConnectionStore((s) => s.loadTabs);
	const plugins = useConnectionStore((s) => s.plugins);
	const activePlugins = useConnectionStore((s) => s.activePlugins);
	const toggleActivePlugin = useConnectionStore((s) => s.toggleActivePlugin);

	const isOnline = browserStatus === "online";
	const [tabDropdownOpen, setTabDropdownOpen] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [showSetup, setShowSetup] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	// 面板状态
	const sbSidebarMode = useSidebarStore((s) => s.sidebarMode);
	const sbCycleMode = useSidebarStore((s) => s.cycleSidebarMode);
	const sbDrawerOpen = useSidebarStore((s) => s.drawerOpen);
	const sbSetDrawerOpen = useSidebarStore((s) => s.setDrawerOpen);
	const sbBreakpoint = useSidebarStore((s) => s.breakpoint);
	const apVisible = useAssetsPanelStore((s) => s.assetsVisible);
	const apSetVisible = useAssetsPanelStore((s) => s.setAssetsVisible);
	const apDrawerOpen = useAssetsPanelStore((s) => s.assetsDrawerOpen);
	const apSetDrawerOpen = useAssetsPanelStore((s) => s.setAssetsDrawerOpen);

	// 侧栏是否当前可见（full/icon 档位 或 移动端抽屉）
	const sidebarActive = sbSidebarMode !== "hidden" || sbDrawerOpen;
	// 资源面板是否当前可见
	const assetsActive = apVisible || apDrawerOpen;

	// 侧栏循环切换：桌面端走三态，移动端走抽屉开关
	const handleSidebarToggle = (): void => {
		if (sbBreakpoint === "mobile" || sbBreakpoint === "tablet") {
			sbSetDrawerOpen(!sbDrawerOpen);
		} else {
			sbCycleMode();
		}
	};

	// 录制状态
	const isRecording = useRecordStore((s) => s.isRecording);
	const actionCount = useRecordStore((s) => s.actionCount);
	const startRecording = useRecordStore((s) => s.startRecording);
	const stopRecording = useRecordStore((s) => s.stopRecording);
	const setActiveView = useViewStore((s) => s.setActiveView);

	const handleToggleRecord = async (): Promise<void> => {
		if (isRecording) {
			await stopRecording();
			// 停止后切到加工 Tab，查看录制结果
			setActiveView("process");
		} else {
			const ok = await startRecording();
			if (ok) {
				// 开始录制后切到加工 Tab，让用户看到录制状态
				setActiveView("process");
			}
		}
	};

	// 点击外部关闭下拉
	useEffect(() => {
		const handler = (e: MouseEvent): void => {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
				setTabDropdownOpen(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, []);

	const handleRefreshTabs = async (): Promise<void> => {
		setRefreshing(true);
		await loadTabs();
		setTimeout(() => setRefreshing(false), 500);
	};

	const effectiveTab = selectedTabIndex ?? activeTabIndex;
	const currentTab = tabs[effectiveTab];

	return (
		<div className="h-10 bg-[var(--color-bg-secondary)] flex items-center px-3 text-xs border-b border-[var(--color-border-primary)] flex-shrink-0 gap-3">
			{/* Logo */}
			<div className="flex items-center gap-2">
				<span className="text-base">◈</span>
				<span className="font-semibold text-sm">Browser Agent</span>
				<span className="text-[var(--color-text-tertiary)]">v0.4.0</span>
			</div>

			{/* 分割线 */}
			<div className="w-px h-4 bg-[var(--color-border-primary)]" />

			{/* 侧栏切换（三态循环：full → icon → hidden） */}
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

			{/* 模式标签 */}
			<span
				className={`px-2 py-0.5 rounded flex items-center gap-1 ${
					mode === "desktop" ? "bg-green-600" : "bg-blue-600"
				}`}
			>
				{mode === "desktop" ? (
					<Monitor className="w-3 h-3" />
				) : (
					<Wifi className="w-3 h-3" />
				)}
				{mode === "desktop" ? t("app.mode.desktop") : t("app.mode.web")}
			</span>

			{/* 连接状态指示器 */}
			<span
				className={`flex items-center gap-1.5 px-2 py-0.5 rounded ${
					isOnline
						? "bg-[var(--color-text-success)]/10 text-[var(--color-text-success)]"
						: "bg-[var(--color-text-error)]/10 text-[var(--color-text-error)]"
				}`}
			>
				{isOnline ? (
					<>
						<span className="relative flex w-2 h-2">
							<span className="absolute inline-flex w-full h-full rounded-full bg-[var(--color-text-success)] opacity-60 animate-ping" />
							<span className="relative inline-flex w-2 h-2 rounded-full bg-[var(--color-text-success)]" />
						</span>
						<Wifi className="w-3 h-3" />
						已连接
						{tabs.length > 0 && (
							<span className="text-[var(--color-text-tertiary)]">· {tabs.length} 标签</span>
						)}
					</>
				) : (
					<>
						<span className="relative flex w-2 h-2">
							<span className="relative inline-flex w-2 h-2 rounded-full bg-[var(--color-text-error)]" />
						</span>
						<WifiOff className="w-3 h-3" />
						未连接
					</>
				)}
			</span>

			{/* 未连接时的安装入口 */}
			{!isOnline && (
				<button
					onClick={() => setShowSetup(true)}
					className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded transition-colors text-white font-medium"
				>
					<Puzzle className="w-3 h-3" />
					安装扩展
				</button>
			)}

			{/* 标签页选择器（仅在线时显示） */}
			{isOnline && tabs.length > 0 && (
				<div className="relative" ref={dropdownRef}>
					<button
						onClick={() => setTabDropdownOpen(!tabDropdownOpen)}
						className="flex items-center gap-1 px-2 py-0.5 rounded border border-[var(--color-border-primary)] hover:bg-[var(--color-bg-hover)] max-w-xs"
						title="选择操作的目标标签页"
					>
						<Globe className="w-3 h-3 flex-shrink-0" />
						<span className="truncate max-w-[120px]">
							{currentTab ? currentTab.title || currentTab.url : `标签 #${effectiveTab}`}
						</span>
						<span className="text-[var(--color-text-tertiary)]">#{effectiveTab}</span>
						<ChevronDown className="w-3 h-3 flex-shrink-0" />
					</button>

					{tabDropdownOpen && (
						<div className="absolute top-full left-0 mt-1 w-80 bg-[var(--color-bg-sidebar)] border border-[var(--color-border-primary)] rounded shadow-lg z-50 max-h-96 overflow-auto">
							{/* 活跃标签页选项（默认） */}
							<button
								onClick={() => {
									selectTab(null);
									setTabDropdownOpen(false);
								}}
								className={`w-full text-left px-3 py-2 hover:bg-[var(--color-bg-hover)] flex items-center gap-2 border-b border-[var(--color-border-secondary)] ${
									selectedTabIndex === null ? "bg-[var(--color-accent)]/10" : ""
								}`}
							>
								<span className="text-[var(--color-text-tertiary)] flex-shrink-0">★</span>
								<div className="flex-1 min-w-0">
									<div className="text-[var(--color-text-primary)]">活跃标签页（自动）</div>
									<div className="text-[var(--color-text-tertiary)] truncate text-[10px]">
										{tabs[activeTabIndex]?.url || "—"}
									</div>
								</div>
							</button>

							{/* 所有标签页 */}
							{tabs.map((tab) => (
								<button
									key={tab.index}
									onClick={() => {
										selectTab(tab.index);
										setTabDropdownOpen(false);
									}}
									className={`w-full text-left px-3 py-2 hover:bg-[var(--color-bg-hover)] flex items-center gap-2 ${
										selectedTabIndex === tab.index ? "bg-[var(--color-accent)]/10" : ""
									}`}
								>
									<span className="text-[var(--color-text-tertiary)] flex-shrink-0">
										#{tab.index}
									</span>
									<div className="flex-1 min-w-0">
										<div className="text-[var(--color-text-primary)] truncate text-xs">
											{tab.title || "(无标题)"}
										</div>
										<div className="text-[var(--color-text-tertiary)] truncate text-[10px]">
											{tab.url}
										</div>
									</div>
									{tab.active && (
										<span className="text-[var(--color-text-success)] text-[10px] flex-shrink-0">
											活跃
										</span>
									)}
								</button>
							))}

							{/* 刷新按钮 */}
							<button
								onClick={handleRefreshTabs}
								className="w-full text-left px-3 py-2 hover:bg-[var(--color-bg-hover)] flex items-center gap-2 border-t border-[var(--color-border-secondary)] text-[var(--color-text-secondary)]"
							>
								<RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
								刷新标签页列表
							</button>
						</div>
					)}
				</div>
			)}

			{/* 弹性间距 */}
			<div className="flex-1" />

			{/* 插件选择器 */}
			<div className="flex items-center gap-1 max-w-md overflow-x-auto">
				{activePlugins.map((name) => (
					<button
						key={name}
						onClick={() => toggleActivePlugin(name)}
						className="px-2 py-0.5 rounded-full bg-[var(--color-accent)]/20 text-[var(--color-text-accent)] text-xs hover:bg-[var(--color-accent)]/30 whitespace-nowrap"
					>
						{name} ✕
					</button>
				))}
				{plugins.length > 0 && (
					<select
						onChange={(e) => {
							if (e.target.value) toggleActivePlugin(e.target.value);
							e.target.value = "";
						}}
						className="bg-transparent border border-[var(--color-border-primary)] rounded px-1 py-0.5 text-xs cursor-pointer"
						defaultValue=""
					>
						<option value="">+ 插件</option>
						{plugins
							.filter((p) => !activePlugins.includes(p.name))
							.map((p) => (
								<option key={p.name} value={p.name}>
									{p.name}
								</option>
							))}
					</select>
				)}
			</div>

			{/* 右侧工具 */}
			<div className="flex items-center gap-1">
				<button
					onClick={() => {
						if (assetsActive) {
							if (apVisible) apSetVisible(false);
							if (apDrawerOpen) apSetDrawerOpen(false);
						} else {
							apSetDrawerOpen(true);
						}
					}}
					title={assetsActive ? "收起资源面板" : "展开资源面板"}
					className={`text-[var(--color-text-placeholder)] hover:text-[var(--color-text-primary)] transition-colors p-1 rounded hover:bg-[var(--color-bg-hover)] ${
						assetsActive ? "text-[var(--color-text-accent)]" : ""
					}`}
				>
					<PanelRight className="w-4 h-4" />
				</button>
				{/* 录制按钮 */}
				<button
					onClick={handleToggleRecord}
					disabled={!isOnline}
					title={isRecording ? `停止录制 (${actionCount} 操作)` : "开始录制浏览器操作"}
					className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors disabled:opacity-30 ${
						isRecording
							? "bg-red-500/20 text-red-400 animate-pulse"
							: "text-[var(--color-text-placeholder)] hover:text-red-400 hover:bg-[var(--color-bg-hover)]"
					}`}
				>
					{isRecording ? <Square className="w-3 h-3 fill-current" /> : <Circle className="w-3 h-3 fill-current" />}
					{isRecording ? `${actionCount}` : ""}
				</button>
				<NetworkToggleButton />
				<LanguageSwitcher />
				<ThemeToggle />
			</div>

			{/* 安装向导 Modal */}
			{showSetup && <SetupWizard onClose={() => setShowSetup(false)} />}
		</div>
	);
}
