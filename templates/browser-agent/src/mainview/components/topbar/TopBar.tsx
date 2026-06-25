/**
 * 顶栏 — Logo、连接状态、标签页选择器、插件、版本号
 *
 * 对应 PRD §5.2 Topbar 职责
 */

import { useState, useEffect, useRef } from "react";
import { Monitor, Wifi, WifiOff, ChevronDown, RefreshCw, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useConnectionStore } from "../../stores/use-connection-store";
import { ThemeToggle } from "../common/ThemeToggle";
import { LanguageSwitcher } from "../common/LanguageSwitcher";
import { NetworkToggleButton } from "../dev/NetworkPanel";

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
	const dropdownRef = useRef<HTMLDivElement>(null);

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
				<NetworkToggleButton />
				<LanguageSwitcher />
				<ThemeToggle />
			</div>
		</div>
	);
}
