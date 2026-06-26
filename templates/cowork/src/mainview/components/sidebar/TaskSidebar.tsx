/**
 * 任务侧栏 — 根据 Tab 切换显示不同内容
 *
 * Cowork: 任务列表 + New task
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
} from 'lucide-react';
import { useTaskStore, type TaskStatus } from '../../stores/use-task-store';
import { useViewStore, type CenterTab } from '../../stores/use-view-store';

const STATUS_ICON: Record<TaskStatus, { icon: typeof Circle; color: string }> = {
	queued: { icon: Clock, color: 'text-[var(--color-text-tertiary)]' },
	analyzing: { icon: Loader2, color: 'text-blue-500 animate-spin' },
	executing: { icon: Loader2, color: 'text-[var(--color-text-accent)] animate-spin' },
	waiting_input: { icon: AlertCircle, color: 'text-amber-500' },
	review: { icon: Circle, color: 'text-purple-500' },
	completed: { icon: CheckCircle2, color: 'text-green-500' },
	failed: { icon: AlertCircle, color: 'text-red-500' },
};

const STATUS_LABEL: Record<TaskStatus, string> = {
	queued: '排队中',
	analyzing: '分析中',
	executing: '执行中',
	waiting_input: '等待输入',
	review: '审核中',
	completed: '已完成',
	failed: '失败',
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
			<div className="p-2 flex flex-col items-center gap-1">
				{centerTab === 'cowork' && (
					<button
						onClick={() => createTask('新任务')}
						title="新建任务"
						className="w-10 h-10 flex items-center justify-center rounded-lg bg-[var(--color-accent)]/15 text-[var(--color-text-accent)] hover:bg-[var(--color-accent)]/25 active:scale-95 transition-all"
					>
						<Plus className="w-4 h-4" />
					</button>
				)}
				<div className="w-6 h-px bg-[var(--color-border-secondary)] my-1" />
				{centerTab === 'cowork' &&
					tasks.slice(0, 8).map((t) => {
						const { icon: Icon, color } = STATUS_ICON[t.status] ?? STATUS_ICON.queued;
						return (
							<button
								key={t.id}
								onClick={() => selectTask(t.id)}
								title={t.title}
								className={`w-10 h-8 flex items-center justify-center rounded-lg transition-all active:scale-95 ${
									t.id === currentTaskId
										? 'bg-[var(--color-bg-active)]'
										: 'hover:bg-[var(--color-bg-hover)]'
								}`}
							>
								<Icon className={`w-3.5 h-3.5 ${color}`} />
							</button>
						);
					})}
				{centerTab === 'chat' && (
					<button
						title="新对话"
						className="w-10 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-hover)] transition-all"
					>
						<MessageSquare className="w-4 h-4 text-[var(--color-text-tertiary)]" />
					</button>
				)}
				{centerTab === 'code' && (
					<button
						title="打开文件"
						className="w-10 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-hover)] transition-all"
					>
						<FolderOpen className="w-4 h-4 text-[var(--color-text-tertiary)]" />
					</button>
				)}
			</div>
		);
	}

	// ── 完整模式 ──
	return (
		<div className="flex flex-col h-full">
			{/* Tab 切换 */}
			<div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-[var(--color-border-secondary)]">
				{(['chat', 'code', 'cowork'] as CenterTab[]).map((tab) => (
					<button
						key={tab}
						onClick={() => setCenterTab(tab)}
						className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
							centerTab === tab
								? 'bg-[var(--color-accent)]/15 text-[var(--color-text-accent)]'
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
					<div className="px-3 py-2">
						<button
							onClick={() => createTask('新任务')}
							className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-accent)]/10 text-[var(--color-text-accent)] hover:bg-[var(--color-accent)]/20 transition-colors text-sm font-medium"
						>
							<Plus className="w-4 h-4" />
							New task
						</button>
					</div>

					{/* 任务列表 */}
					<div className="flex-1 overflow-auto px-2 space-y-0.5">
						{tasks.map((task) => {
							const { icon: Icon, color } = STATUS_ICON[task.status] ?? STATUS_ICON.queued;
							const isActive = task.id === currentTaskId;
							return (
								<button
									key={task.id}
									onClick={() => selectTask(task.id)}
									className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
										isActive
											? 'bg-[var(--color-bg-active)] text-[var(--color-text-primary)]'
											: 'hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]'
									}`}
								>
									<div className="flex items-center gap-2">
										<Icon className={`w-3.5 h-3.5 flex-shrink-0 ${color}`} />
										<span className="text-sm truncate flex-1">{task.title}</span>
									</div>
									<div className="text-xs text-[var(--color-text-tertiary)] mt-0.5 ml-5">
										{STATUS_LABEL[task.status] ?? '未知'}
									</div>
								</button>
							);
						})}
						{tasks.length === 0 && (
							<div className="px-3 py-4 text-xs text-[var(--color-text-tertiary)] text-center">
								暂无任务
							</div>
						)}
					</div>
				</>
			)}

			{centerTab === 'chat' && (
				<div className="flex-1 flex flex-col items-center justify-center text-[var(--color-text-tertiary)] px-4">
					<MessageSquare className="w-8 h-8 mb-2 opacity-50" />
					<p className="text-sm text-center">聊天会话列表</p>
					<p className="text-xs text-center mt-1">开发中...</p>
				</div>
			)}

			{centerTab === 'code' && (
				<div className="flex-1 flex flex-col items-center justify-center text-[var(--color-text-tertiary)] px-4">
					<FolderOpen className="w-8 h-8 mb-2 opacity-50" />
					<p className="text-sm text-center">文件浏览器</p>
					<p className="text-xs text-center mt-1">开发中...</p>
				</div>
			)}

			{/* 底部提示（仅 Cowork） */}
			{centerTab === 'cowork' && (
				<div className="px-3 py-2 border-t border-[var(--color-border-secondary)]">
					<p className="text-xs text-[var(--color-text-tertiary)]">
						These tasks run locally and aren't synced across devices
					</p>
				</div>
			)}
		</div>
	);
}
