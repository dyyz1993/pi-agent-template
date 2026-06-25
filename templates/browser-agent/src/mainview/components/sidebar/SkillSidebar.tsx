/**
 * 技能侧栏 — 内置采集技能列表
 *
 * 点击技能 → 创建会话 → 触发 Agent 对话（带流式订阅）
 */

import { useTranslation } from "react-i18next";
import { useSessionStore } from "../../stores/use-session-store";
import { useAgentChat } from "../../hooks/use-agent-chat";

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

export function SkillSidebar() {
	const { t: _t } = useTranslation();
	const running = useSessionStore((s) => s.running);
	const newSessionSmart = useSessionStore((s) => s.newSessionSmart);
	const currentSessionId = useSessionStore((s) => s.currentSessionId);
	const { chat } = useAgentChat();

	const runSkill = async (skill: (typeof BUILTIN_SKILLS)[0]): Promise<void> => {
		if (running) return;

		// 智能创建会话（空会话复用）
		const sessionId = currentSessionId || await newSessionSmart();

		// 触发 Agent 对话（useAgentChat 内部会订阅流式事件）
		await chat(skill.prompt, sessionId, ["xiaohongshu"]);
	};

	return (
		<div className="p-2">
			<h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider px-2 mb-2">
				技能库
			</h3>
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
		</div>
	);
}
