/**
 * ToolPicker — 工具/插件快捷选择栏
 *
 * 用户点选工具卡片（可多选），选中的工具以 chip 形式展示在输入框上方。
 * 发送时，选中的工具列表 + 输入框文本一起发给 Agent。
 * Agent 根据工具列表自动编排执行顺序。
 */

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { useConnectionStore } from "../../stores/use-connection-store";

/** 内置工具模板（不需要 xbrowser 插件支持） */
const BUILTIN_TOOLS = [
	{ id: "scrape", label: "📡 采集页面", hint: "提取当前页面内容转 Markdown" },
	{ id: "crawl", label: "🕷️ 爬取网站", hint: "批量爬取多个页面" },
	{ id: "map", label: "🗺️ 网站地图", hint: "发现网站所有 URL" },
	{ id: "screenshot", label: "📸 截图", hint: "截取当前页面" },
	{ id: "search", label: "🔍 搜索", hint: "搜索引擎搜索关键词" },
	{ id: "scrape-xhs", label: "📕 小红书", hint: "采集小红书笔记" },
];

interface ToolPickerProps {
	selectedTools: string[];
	onToggle: (toolId: string) => void;
	onClear: () => void;
}

export function ToolPicker({ selectedTools, onToggle, onClear }: ToolPickerProps) {
	const [expanded, setExpanded] = useState(false);
	const plugins = useConnectionStore((s) => s.plugins);

	// 合并内置工具 + xbrowser 插件
	const allTools = [
		...BUILTIN_TOOLS,
		...plugins
			.filter((p) => !BUILTIN_TOOLS.some((b) => b.id === p.name))
			.map((p) => ({ id: p.name, label: `🧩 ${p.name}`, hint: p.description })),
	];

	const selectedSet = new Set(selectedTools);

	return (
		<div className="mb-2">
			{/* 选中的工具 chips */}
			{selectedTools.length > 0 && (
				<div className="flex items-center gap-1 mb-1.5 flex-wrap">
					{selectedTools.map((toolId) => {
						const tool = allTools.find((t) => t.id === toolId);
						return (
							<span
								key={toolId}
								className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-text-accent)] text-xs"
							>
								{tool?.label || toolId}
								<button
									onClick={() => onToggle(toolId)}
									className="hover:text-[var(--color-text-error)]"
								>
									<X className="w-3 h-3" />
								</button>
							</span>
						);
					})}
					<button
						onClick={onClear}
						className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
					>
						清空
					</button>
				</div>
			)}

			{/* 工具选择栏（可展开/收起） */}
			<div className="flex items-center gap-1 flex-wrap">
				{expanded ? (
					<>
						{allTools.map((tool) => {
							const isSelected = selectedSet.has(tool.id);
							return (
								<button
									key={tool.id}
									onClick={() => onToggle(tool.id)}
									title={tool.hint}
									className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
										isSelected
											? "bg-[var(--color-accent)]/20 text-[var(--color-text-accent)] border border-[var(--color-accent)]/40"
											: "border border-[var(--color-border-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
									}`}
								>
									{tool.label}
									{isSelected && <span className="ml-1">✓</span>}
								</button>
							);
						})}
						<button
							onClick={() => setExpanded(false)}
							className="px-2 py-1 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
						>
							收起
						</button>
					</>
				) : (
					<button
						onClick={() => setExpanded(true)}
						className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs border border-[var(--color-border-secondary)] text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)] transition-colors"
					>
						<Plus className="w-3 h-3" />
						选择工具{selectedTools.length > 0 ? ` (${selectedTools.length})` : ""}
					</button>
				)}
			</div>
		</div>
	);
}
