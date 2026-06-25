/**
 * 顶栏 — Logo、插件选择器、连接状态、版本号
 *
 * 对应 PRD §5.2 Topbar 职责
 */

import { Monitor, Wifi, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useConnectionStore } from "../../stores/use-connection-store";
import { ThemeToggle } from "../common/ThemeToggle";
import { LanguageSwitcher } from "../common/LanguageSwitcher";
import { NetworkToggleButton } from "../dev/NetworkPanel";

export function TopBar() {
	const { t } = useTranslation();
	const mode = useConnectionStore((s) => s.mode);
	const browserStatus = useConnectionStore((s) => s.browserStatus);
	const plugins = useConnectionStore((s) => s.plugins);
	const activePlugins = useConnectionStore((s) => s.activePlugins);
	const toggleActivePlugin = useConnectionStore((s) => s.toggleActivePlugin);

	const isOnline = browserStatus === "online";

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

			{/* 连接状态 */}
			<span
				className={`flex items-center gap-1 ${
					isOnline
						? "text-[var(--color-text-success)]"
						: "text-[var(--color-text-error)]"
				}`}
			>
				{isOnline ? (
					<Wifi className="w-3 h-3" />
				) : (
					<WifiOff className="w-3 h-3" />
				)}
				{isOnline ? t("app.online") : t("app.offline")}
				{isOnline && ` · ${useConnectionStore.getState().browsers.length} 标签页`}
			</span>

			{/* 插件选择器 */}
			<div className="flex-1" />
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
