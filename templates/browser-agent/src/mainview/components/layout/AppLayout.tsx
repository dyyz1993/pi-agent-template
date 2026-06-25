/**
 * Browser Agent — 三栏布局
 *
 * 对应 PRD §5.1 三栏布局：侧栏 | 对话区 | 资源面板
 */

import { useTranslation } from "react-i18next";
import { TopBar } from "../topbar/TopBar";
import { SkillSidebar } from "../sidebar/SkillSidebar";
import { SessionSidebar } from "../sidebar/SessionSidebar";
import { ChatPanel } from "../chat/ChatPanel";
import { AssetsPanel } from "../assets/AssetsPanel";

export type CenterTab = "chat";

interface AppLayoutProps {
	centerTab: CenterTab;
	setCenterTab: (tab: CenterTab) => void;
	sidebarWidth: number;
	handleResizeStart: (e: React.MouseEvent) => void;
}

export function AppLayout({
	sidebarWidth,
	handleResizeStart,
	}: AppLayoutProps) {
		useTranslation();

		return (
			<div className="h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] flex flex-col overflow-hidden">
				{/* 顶栏 */}
				<TopBar />

				<div className="flex-1 flex overflow-hidden">
					{/* 侧栏（技能 + 会话历史） */}
					<div
						className="bg-[var(--color-bg-sidebar)] border-r border-[var(--color-border-primary)] flex flex-col flex-shrink-0 overflow-hidden"
						style={{ width: sidebarWidth }}
					>
						<SkillSidebar />
						<div className="flex-1 overflow-auto">
							<SessionSidebar />
						</div>
						<div
							className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[var(--color-accent)]/50 active:bg-[var(--color-accent)] transition-colors z-10 group"
							onMouseDown={handleResizeStart}
							style={{ width: 4, marginRight: -4 }}
						>
							<div className="absolute inset-y-0 left-1/2 w-0.5 bg-[var(--color-border-primary)] group-hover:bg-[var(--color-text-accent)] transition-colors -translate-x-1/2" />
						</div>
					</div>

					{/* 对话区 */}
					<div className="flex-1 flex flex-col overflow-hidden">
						<ChatPanel />
					</div>

					{/* 资源面板（右侧） */}
					<div
						className="bg-[var(--color-bg-secondary)] border-l border-[var(--color-border-primary)] flex flex-col flex-shrink-0 overflow-hidden"
						style={{ width: 300 }}
					>
						<AssetsPanel />
					</div>
				</div>
			</div>
		);
}