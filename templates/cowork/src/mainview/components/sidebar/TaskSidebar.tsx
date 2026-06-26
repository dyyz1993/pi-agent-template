/**
 * 任务侧栏 — 根据 Tab 切换显示不同内容
 *
 * Cowork: 任务列表 + New task（带状态色标签）
 * Chat: 聊天会话列表
 * Code: 文件树（预留）
 */
import { useEffect } from 'react';
import {
	Plus,
	Circle,
	CheckCircle2,
	AlertCircle,
	Clock,
	Loader2,
	MessageSquare,
	FolderOpen,
	type LucideIcon,
} from 'lucide-react';
import { useTaskStore, type TaskStatus } from '../../stores/use-task-store';
import { useViewStore, type CenterTab } from '../../stores/use-view-store';

const STATUS_CONFIG: Record<
	TaskStatus,
	{ icon: LucideIcon; color: string; bg: string; label: string }
> = {
	queued: {
		icon: Clock,
		color: 'text-slate-400',
		bg: 'bg-slate-100 dark:bg-slate-700/50',
		label: 'Queued',
	},
	analyzing: {
		icon: Loader2,
		color: 'text-blue-500',
		bg: 'bg-blue-100 dark:bg-blue-900/30',
		label: 'Analyzing',
	},
	executing: {
		icon: Loader2,
		color: 'text-indigo-500',
		bg: 'bg-indigo-100 dark:bg-indigo-900/30',
		label: 'Executing',
	},
	waiting_input: {
		icon: AlertCircle,
		color: 'text-amber-500',
		bg: 'bg-amber-100 dark:bg-amber-900/30',
		label: 'Waiting',
	},
	review: {
		icon: Circle,
		color: 'text-purple-500',
		bg: 'bg-purple-100 dark:bg-purple-900/30',
		label: 'Review',
	},
	completed: {
		icon: CheckCircle2,
		color: 'text-green-600',
		bg: 'bg-green-100 dark:bg-green-900/30',
		label: 'Done',
	},
	failed: {
		icon: AlertCircle,
		color: 'text-red-500',
		bg: 'bg-red-100 dark:bg-red-900/30',
		label: 'Failed',
	},
};

interface TaskSidebarProps {
	collapsed?: boolean;
}

export function TaskSidebar({ collapsed }: TaskSidebarProps) {
	const tasks = useTaskStore((s) => s.tasks);
	const currentTaskId = useTaskStore((s) => s.currentTaskId);
	const fetchTasks = useTaskStore((s) => s.fetchTasks);
	const createTask = useTaskStore((s) => s.createTask);
	const selectTask = useTaskStore((s) => s.selectTask);

	const centerTab = useViewStore((s) => s.centerTab);
	const setCenterTab = useViewStore((s) => s.setCenterTab);

	useEffect(() => {
		fetchTasks();
	}, []);

	// ── 图标条模式 ──
	if (collapsed) {
		return (
			<div className="py-2 px-1.5 flex flex-col items-center gap-1">
				{centerTab === 'cowork' && (
					<button
						onClick={() => createTask('新任务')}
						title="新建任务"
						className="w-9 h-9 flex items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-800/40 active:scale-95 transition-all"
					>
						<Plus className="w-4 h-4" />
					</button>
				)}
				<div className="w-5 h-px bg-[var(--color-border-secondary)] my-1" />
				{centerTab === 'cowork' &&
					tasks.slice(0, 8).map((t) => {
						const cfg = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.queued;
						const Icon = cfg.icon;
						return (
							<button
								key={t.id}
								onClick={() => selectTask(t.id)}
								title={t.title}
								className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all active:scale-95 ${
									t.id === currentTaskId
										? 'bg-[var(--color-bg-active)]'
										: 'hover:bg-[var(--color-bg-hover)]'
								}`}
							>
								<Icon
									className={`w-4 h-4 ${cfg.color} ${t.status === 'executing' || t.status === 'analyzing' ? 'animate-spin' : ''}`}
								/>
							</button>
						);
					})}
			</div>
		);
	}

	// ── 完整模式 ──
	return (
		<div className="flex flex-col h-full">
			{/* Tab 切换 */}
			<div className="flex items-center gap-1 px-3 py-2.5 border-b border-[var(--color-border-secondary)]">
				{(['chat', 'code', 'cowork'] as CenterTab[]).map((tab) => (
					<button
						key={tab}
						onClick={() => setCenterTab(tab)}
						className={`flex-1 px-3 py-1.5 text-[13px] font-medium rounded-lg transition-all ${
							centerTab === tab
								? 'bg-[var(--color-bg-active)] text-[var(--color-text-primary)]'
								: 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'
						}`}
					>
						{tab === 'chat' ? 'Chat' : tab === 'code' ? 'Code' : 'Cowork'}
					</button>
				))}
			</div>

			{/* 根据 Tab 显示不同内容 */}
			{centerTab === 'cowork' && (
				<>
					{/* New task 按钮 */}
					<div className="px-3 pt-3 pb-2">
						<button
							onClick={() => createTask('新任务')}
							className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-bg-primary)] border border-[var(--color-border-secondary)] text-[var(--color-text-primary)] hover:border-[var(--color-text-accent)] hover:shadow-sm transition-all text-[13px] font-medium"
						>
							<Plus className="w-4 h-4 text-[var(--color-text-accent)]" />
							New task
						</button>
					</div>

					{/* 任务列表 */}
					<div className="flex-1 overflow-auto px-2 space-y-0.5">
						{tasks.map((task) => {
							const cfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.queued;
							const Icon = cfg.icon;
							const isActive = task.id === currentTaskId;
							return (
								<button
									key={task.id}
									onClick={() => selectTask(task.id)}
									className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
										isActive ? 'bg-[var(--color-bg-active)]' : 'hover:bg-[var(--color-bg-hover)]'
									}`}
								>
									<div className="flex items-start gap-2.5">
										<div
											className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.bg}`}
										>
											<Icon
												className={`w-3.5 h-3.5 ${cfg.color} ${task.status === 'executing' || task.status === 'analyzing' ? 'animate-spin' : ''}`}
											/>
										</div>
										<div className="flex-1 min-w-0">
											<div
												className={`text-[13px] leading-snug truncate ${isActive ? 'font-medium text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}
											>
												{task.title}
											</div>
											<div className="flex items-center gap-1.5 mt-1">
												<span className={`text-[11px] font-medium ${cfg.color}`}>{cfg.label}</span>
												{task.progress?.steps && (
													<span className="text-[11px] text-[var(--color-text-tertiary)]">
														· {task.progress.steps.filter((s) => s.status === 'done').length}/
														{task.progress.steps.length}
													</span>
												)}
											</div>
										</div>
									</div>
								</button>
							);
						})}
						{tasks.length === 0 && (
							<div className="px-3 py-8 text-center">
								<p className="text-sm text-[var(--color-text-tertiary)]">暂无任务</p>
							</div>
						)}
					</div>

					{/* 底部提示 */}
					<div className="px-3 py-2.5 border-t border-[var(--color-border-secondary)]">
						<p className="text-[11px] text-[var(--color-text-tertiary)] leading-relaxed">
							These tasks run locally and aren't synced across devices
						</p>
					</div>
				</>
			)}

			{centerTab === 'chat' && (
				<div className="flex-1 flex flex-col items-center justify-center text-[var(--color-text-tertiary)] px-4">
					<MessageSquare className="w-8 h-8 mb-2 opacity-40" />
					<p className="text-sm font-medium">Chat 会话</p>
					<p className="text-xs mt-1">开发中...</p>
				</div>
			)}

			{centerTab === 'code' && (
				<div className="flex-1 flex flex-col items-center justify-center text-[var(--color-text-tertiary)] px-4">
					<FolderOpen className="w-8 h-8 mb-2 opacity-40" />
					<p className="text-sm font-medium">文件浏览器</p>
					<p className="text-xs mt-1">开发中...</p>
				</div>
			)}
		</div>
	);
}
