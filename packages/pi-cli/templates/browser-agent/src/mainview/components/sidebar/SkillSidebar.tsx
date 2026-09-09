/**
 * 技能侧栏 — 内置采集技能列表
 *
 * 点击技能 → 创建会话 → 触发 Agent 对话（带流式订阅）
 * 支持两种模式：完整（带区块折叠）+ 图标条（collapsed）
 */

import { useSessionStore } from "../../stores/use-session-store";
import { useAgentChat } from "../../hooks/use-agent-chat";
import { useSidebarStore } from "../../stores/use-sidebar-store";

interface SkillSidebarProps {
	/** 图标条模式：只显示技能图标，hover 显示名称 */
	collapsed?: boolean;
}

const BUILTIN_SKILLS = [
	{
		id: "xhs-explore",
		name: "小红书首页采集",
		icon: "📕",
		description: "采集小红书首页推荐笔记",
		prompt: "采集小红书首页热门笔记",
	},
	{
		id: "xhs-search",
		name: "关键词搜索采集",
		icon: "🔍",
		description: "搜索指定关键词的小红书笔记",
		prompt: "搜索小红书关于美妆的笔记",
	},
	{
		id: "xhs-blogger",
		name: "博主主页采集",
		icon: "👤",
		description: "采集小红书博主主页的全部笔记",
		prompt: "采集这个小红书博主的主页内容",
	},
];

export function SkillSidebar({ collapsed }: SkillSidebarProps) {
	const running = useSessionStore((s) => s.running);
	const newSessionSmart = useSessionStore((s) => s.newSessionSmart);
	const currentSessionId = useSessionStore((s) => s.currentSessionId);
	const { chat } = useAgentChat();

	const sectionCollapsed = useSidebarStore((s) => s.collapsedSections.has("skills"));
	const toggleSection = useSidebarStore((s) => s.toggleSection);

	const runSkill = async (skill: (typeof BUILTIN_SKILLS)[0]): Promise<void> => {
		if (running) return;

		// 智能创建会话（空会话复用）
		const sessionId = currentSessionId || (await newSessionSmart());

		// 触发 Agent 对话（useAgentChat 内部会订阅流式事件）
		await chat(skill.prompt, sessionId, ["xiaohongshu"]);
	};

	// ── 图标条模式：只显示技能图标 ──
	if (collapsed) {
		return (
			<div className="p-2 flex flex-col items-center gap-1">
				{BUILTIN_SKILLS.map((skill) => (
					<button
						key={skill.id}
						onClick={() => runSkill(skill)}
						disabled={running}
						title={skill.name}
						className="w-10 h-10 flex items-center justify-center text-xl rounded-lg hover:bg-[var(--color-bg-hover)] active:scale-95 transition-all disabled:opacity-50"
					>
						{skill.icon}
					</button>
				))}
			</div>
		);
	}

	// ── 完整模式：带 section header 可折叠 ──
	return (
		<div className="p-2">
			<button
				onClick={() => toggleSection("skills")}
				className="w-full flex items-center gap-1 px-2 mb-1 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider hover:text-[var(--color-text-primary)] transition-colors"
			>
				<span className="text-[10px]">{sectionCollapsed ? "▸" : "▾"}</span>
				技能库
			</button>
			{!sectionCollapsed && (
				<div className="space-y-1">
					{BUILTIN_SKILLS.map((skill) => (
						<button
							key={skill.id}
							onClick={() => runSkill(skill)}
							disabled={running}
							className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors disabled:opacity-50"
						>
							<div className="flex items-center gap-2">
								<span className="text-lg">{skill.icon}</span>
								<div className="flex-1 min-w-0">
									<div className="text-sm font-medium truncate">
										{skill.name}
									</div>
									<div className="text-xs text-[var(--color-text-tertiary)] truncate">
										{skill.description}
									</div>
								</div>
							</div>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
