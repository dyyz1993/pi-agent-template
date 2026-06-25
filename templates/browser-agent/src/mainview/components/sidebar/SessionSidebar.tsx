/**
 * 会话侧栏 — 历史会话列表
 *
 * 支持两种模式：完整（带区块折叠）+ 图标条（collapsed）
 */

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus, MessagesSquare } from "lucide-react";
import { useSessionStore } from "../../stores/use-session-store";
import { useSidebarStore } from "../../stores/use-sidebar-store";

interface SessionSidebarProps {
	/** 图标条模式 */
	collapsed?: boolean;
}

export function SessionSidebar({ collapsed }: SessionSidebarProps) {
	const { t } = useTranslation();
	const sessions = useSessionStore((s) => s.sessions);
	const currentSessionId = useSessionStore((s) => s.currentSessionId);
	const refreshSessions = useSessionStore((s) => s.refreshSessions);
	const newSessionSmart = useSessionStore((s) => s.newSessionSmart);
	const loadSession = useSessionStore((s) => s.loadSession);

	const sectionCollapsed = useSidebarStore((s) => s.collapsedSections.has("sessions"));
	const toggleSection = useSidebarStore((s) => s.toggleSection);

	useEffect(() => {
		refreshSessions();
	}, []);

	const handleNewSession = async () => {
		await newSessionSmart();
	};

	const handleSwitchSession = async (id: string) => {
		await loadSession(id);
	};

	// ── 图标条模式：只显示会话入口图标 + 新建按钮 ──
	if (collapsed) {
		return (
			<div className="p-2 flex flex-col items-center gap-1">
				<button
					onClick={handleNewSession}
					title={t("session.new")}
					className="w-10 h-10 flex items-center justify-center rounded-lg bg-[var(--color-accent)]/15 text-[var(--color-text-accent)] hover:bg-[var(--color-accent)]/25 active:scale-95 transition-all"
				>
					<Plus className="w-4 h-4" />
				</button>
				<div className="w-6 h-px bg-[var(--color-border-secondary)] my-1" />
				{sessions.slice(0, 8).map((s) => (
					<button
						key={s.id}
						onClick={() => handleSwitchSession(s.id)}
						title={s.title}
						className={`w-10 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-all active:scale-95 ${
							s.id === currentSessionId
								? "bg-[var(--color-bg-active)] text-[var(--color-text-primary)]"
								: "text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
						}`}
					>
						{(s.title || "?").charAt(0).toUpperCase()}
					</button>
				))}
				{sessions.length === 0 && (
					<div title="暂无会话" className="w-10 h-8 flex items-center justify-center text-[var(--color-text-placeholder)]">
						<MessagesSquare className="w-4 h-4 opacity-50" />
					</div>
				)}
			</div>
		);
	}

	// ── 完整模式：带 section header 可折叠 ──
	return (
		<div className="p-2">
			<div className="flex items-center justify-between px-2 mb-1">
				<button
					onClick={() => toggleSection("sessions")}
					className="flex items-center gap-1 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider hover:text-[var(--color-text-primary)] transition-colors"
				>
					<span className="text-[10px]">{sectionCollapsed ? "▸" : "▾"}</span>
					历史会话
				</button>
				<button
					onClick={handleNewSession}
					className="p-1 rounded hover:bg-[var(--color-bg-hover)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
					title={t("session.new")}
				>
					<Plus className="w-3.5 h-3.5" />
				</button>
			</div>
			{!sectionCollapsed && (
				<div className="space-y-0.5">
					{sessions.map((s) => (
						<button
							key={s.id}
							onClick={() => handleSwitchSession(s.id)}
							className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
								s.id === currentSessionId
									? "bg-[var(--color-bg-active)] text-[var(--color-text-primary)]"
									: "hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]"
							}`}
						>
							<div className="truncate">{s.title}</div>
							<div className="text-xs text-[var(--color-text-tertiary)]">
								{s.messageCount} 条消息
							</div>
						</button>
					))}
					{sessions.length === 0 && (
						<div className="px-3 py-2 text-xs text-[var(--color-text-tertiary)]">
							暂无会话
						</div>
					)}
				</div>
			)}
		</div>
	);
}
