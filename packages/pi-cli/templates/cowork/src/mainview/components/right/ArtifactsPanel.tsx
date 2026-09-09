/**
 * 产出物面板 — Artifacts 列表
 */
import { useEffect } from 'react';
import { FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { useOutputStore } from '../../stores/use-output-store';
import { useViewStore } from '../../stores/use-view-store';

export function ArtifactsPanel() {
	const outputs = useOutputStore((s) => s.outputs);
	const fetchOutputs = useOutputStore((s) => s.fetchOutputs);

	const collapsed = useViewStore((s) => s.rightPanelCollapsed['artifacts']);
	const toggle = useViewStore((s) => s.toggleRightPanel);

	useEffect(() => {
		fetchOutputs();
	}, []);

	return (
		<div className="border-b border-[var(--color-border-secondary)]">
			<button
				onClick={() => toggle('artifacts')}
				className="w-full flex items-center gap-1.5 px-4 py-3 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors"
			>
				{collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
				Artifacts
			</button>
			{!collapsed && (
				<div className="px-3 pb-3 space-y-0.5">
					{outputs.length === 0 ? (
						<p className="text-xs text-[var(--color-text-tertiary)] px-3">No artifacts yet.</p>
					) : (
						outputs.map((output) => (
							<div
								key={output.id}
								className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer"
							>
								<div className="w-7 h-7 rounded-md bg-[var(--color-bg-tertiary)] flex items-center justify-center flex-shrink-0">
									<FileText className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
								</div>
								<div className="flex-1 min-w-0">
									<div className="text-sm text-[var(--color-text-secondary)] truncate">
										{output.name}
									</div>
								</div>
							</div>
						))
					)}
				</div>
			)}
		</div>
	);
}
