/**
 * 产出物面板 — Artifacts 列表
 */
import { useEffect } from "react";
// Artifacts panel icons
import { useOutputStore } from "../../stores/use-output-store";
import { useViewStore } from "../../stores/use-view-store";

const KIND_ICON: Record<string, string> = {
	file: "📄",
	snippet: "📝",
	link: "🔗",
};

export function ArtifactsPanel() {
	const outputs = useOutputStore((s) => s.outputs);
	const fetchOutputs = useOutputStore((s) => s.fetchOutputs);

	const collapsed = useViewStore((s) => s.rightPanelCollapsed["artifacts"]);
	const toggle = useViewStore((s) => s.toggleRightPanel);

	useEffect(() => {
		fetchOutputs();
	}, []);

	return (
		<div className="border-b border-[var(--color-border-secondary)]">
			<button
				onClick={() => toggle("artifacts")}
				className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors"
			>
				Artifacts
				{collapsed ? "▸" : "▾"}
			</button>
			{!collapsed && (
				<div className="px-4 pb-3 space-y-1">
					{outputs.length === 0 ? (
						<p className="text-xs text-[var(--color-text-tertiary)]">No artifacts yet.</p>
					) : (
						outputs.map((output) => (
							<div
								key={output.id}
								className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer"
							>
								<span className="text-lg">{KIND_ICON[output.kind] ?? "📄"}</span>
								<span className="text-sm text-[var(--color-text-secondary)] truncate">
									{output.name}
								</span>
							</div>
						))
					)}
				</div>
			)}
		</div>
	);
}
