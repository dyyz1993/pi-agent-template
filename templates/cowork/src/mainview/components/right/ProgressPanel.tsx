/**
 * 进度面板 — 步骤可视化
 */
import {
	CheckCircle2,
	Circle,
	Loader2,
	AlertCircle,
	ChevronDown,
	ChevronRight,
} from 'lucide-react';
import { useTaskStore, type Step } from '../../stores/use-task-store';
import { useViewStore } from '../../stores/use-view-store';

const STEP_ICON: Record<Step['status'], { icon: typeof Circle; color: string; bg: string }> = {
	pending: {
		icon: Circle,
		color: 'text-[var(--color-text-tertiary)]',
		bg: 'bg-[var(--color-bg-tertiary)]',
	},
	running: {
		icon: Loader2,
		color: 'text-[var(--color-text-accent)]',
		bg: 'bg-[var(--color-accent)]/15',
	},
	done: {
		icon: CheckCircle2,
		color: 'text-green-600 dark:text-green-400',
		bg: 'bg-green-100 dark:bg-green-900/30',
	},
	error: {
		icon: AlertCircle,
		color: 'text-red-600 dark:text-red-400',
		bg: 'bg-red-100 dark:bg-red-900/30',
	},
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
				className="w-full flex items-center gap-1.5 px-4 py-3 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors"
			>
				{collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
				Progress
			</button>
			{!collapsed && (
				<div className="px-4 pb-4">
					{steps.length === 0 ? (
						<p className="text-xs text-[var(--color-text-tertiary)] leading-relaxed">
							Steps will show as the task unfolds.
						</p>
					) : (
						<div className="flex items-center gap-1.5 flex-wrap">
							{steps.map((step, i) => {
								const { icon: Icon, color, bg } = STEP_ICON[step.status] ?? STEP_ICON.pending;
								return (
									<div key={i} className="flex items-center gap-1.5">
										<div
											className={`w-7 h-7 rounded-full flex items-center justify-center ${bg}`}
											title={step.label}
										>
											<Icon
												className={`w-3.5 h-3.5 ${color} ${step.status === 'running' ? 'animate-spin' : ''}`}
											/>
										</div>
										{i < steps.length - 1 && (
											<div className="w-3 h-px bg-[var(--color-border-secondary)]" />
										)}
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
