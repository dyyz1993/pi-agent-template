/**
 * 会话侧栏 — 历史会话列表
 *
 * 对应 PRD §5.2 侧栏历史会话职责
 */

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { useSessionStore } from "../../stores/use-session-store";

export function SessionSidebar() {
	const { t } = useTranslation();
	const sessions = useSessionStore((s) => s.sessions);
	const currentSessionId = useSessionStore((s) => s.currentSessionId);
	const refreshSessions = useSessionStore((s) => s.refreshSessions);
	const newSessionSmart = useSessionStore((s) => s.newSessionSmart);
	const loadSession = useSessionStore((s) => s.loadSession);

	useEffect(() => {
		refreshSessions();
	}, []);

	const handleNewSession = async () => {
		await newSessionSmart();
	};

	const handleSwitchSession = async (id: string) => {
		await loadSession(id);
	};

	return (
		<div className="p-2">
			<div className="flex items-center justify-between px-2 mb-2">
				<h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
					历史会话
				</h3>
				<button
					onClick={handleNewSession}
					className="p-1 rounded hover:bg-[var(--color-bg-hover)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
					title={t("session.new")}
				>
					<Plus className="w-3.5 h-3.5" />
				</button>
			</div>
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
		</div>
	);
}
