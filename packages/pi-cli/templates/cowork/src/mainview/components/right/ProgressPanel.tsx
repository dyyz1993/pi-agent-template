/**
 * 进度面板 — 步骤可视化（带状态文字 + 详情）
 */
import {
	CheckCircle2,
	Circle,
	Loader2,
	AlertCircle,
	ChevronDown,
	ChevronRight,
	type LucideIcon,
} from 'lucide-react';
import { useTaskStore, type Step } from '../../stores/use-task-store';
import { useViewStore } from '../../stores/use-view-store';

const STEP_ICON: Record<Step['status'], { icon: LucideIcon; color: string; bg: string }> = {
	pending: { icon: Circle, color: 'text-slate-400', bg: 'bg-slate-100 dark:bg-slate-700/50' },
	running: { icon: Loader2, color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
	done: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
	error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
};

export function ProgressPanel() {
	const currentTaskId = useTaskStore((s) => s.currentTaskId);
	const tasks = useTaskStore((s) => s.tasks);
	const currentTask = tasks.find((t) => t.id === currentTaskId);
	const steps = currentTask?.progress?.steps ?? [];

	const collapsed = useViewStore((s) => s.rightPanelCollapsed['progress']);
	const toggle = useViewStore((s) => s.toggleRightPanel);

	return (
		<div className="border-b border-[var(--color-border-secondary)]">
			<button
				onClick={() => toggle('progress')}
				className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors"
			>
				{collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
				Progress
				{steps.length > 0 && (
					<span className="ml-auto text-xs font-normal text-[var(--color-text-tertiary)]">
						{steps.filter((s) => s.status === 'done').length}/{steps.length}
					</span>
				)}
			</button>
			{!collapsed && (
				<div className="px-4 pb-4">
					{steps.length === 0 ? (
						<p className="text-xs text-[var(--color-text-tertiary)] leading-relaxed">
							Steps will show as the task unfolds.
						</p>
					) : (
						<div className="space-y-2.5">
							{steps.map((step, i) => {
								const cfg = STEP_ICON[step.status] ?? STEP_ICON.pending;
								const Icon = cfg.icon;
								return (
									<div key={i} className="flex items-center gap-2.5">
										<div
											className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg}`}
										>
											<Icon
												className={`w-3.5 h-3.5 ${cfg.color} ${step.status === 'running' ? 'animate-spin' : ''}`}
											/>
										</div>
										<div className="flex-1 min-w-0">
											<div className="text-[13px] text-[var(--color-text-secondary)] truncate">
												{step.label}
											</div>
											{step.detail && (
												<div className="text-[11px] text-[var(--color-text-tertiary)] truncate mt-0.5">
													{step.detail}
												</div>
											)}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
