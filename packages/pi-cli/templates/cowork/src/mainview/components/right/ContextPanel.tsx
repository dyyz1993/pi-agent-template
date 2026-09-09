/**
 * 上下文面板 — 文件夹 / 连接器 / 工作文件
 */
import { useEffect } from 'react';
import { Folder, Globe, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { useContextStore } from '../../stores/use-context-store';
import { useViewStore } from '../../stores/use-view-store';

function SubSection({
	label,
	icon: Icon,
	count,
	collapsed,
	onToggle,
	children,
}: {
	label: string;
	icon: typeof Folder;
	count?: number;
	collapsed: boolean;
	onToggle: () => void;
	children: React.ReactNode;
}) {
	return (
		<div className="mb-1">
			<button
				onClick={onToggle}
				className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
			>
				{collapsed ? (
					<ChevronRight className="w-3.5 h-3.5" />
				) : (
					<ChevronDown className="w-3.5 h-3.5" />
				)}
				<Icon className="w-3.5 h-3.5" />
				<span>{label}</span>
				{count !== undefined && (
					<span className="ml-auto text-[var(--color-text-tertiary)]">{count}</span>
				)}
			</button>
			{!collapsed && <div className="pl-7 pt-0.5">{children}</div>}
		</div>
	);
}

export function ContextPanel() {
	const folders = useContextStore((s) => s.folders);
	const connectors = useContextStore((s) => s.connectors);
	const workingFiles = useContextStore((s) => s.workingFiles);
	const fetchAll = useContextStore((s) => s.fetchAll);

	const collapsed = useViewStore((s) => s.rightPanelCollapsed['context']);
	const toggle = useViewStore((s) => s.toggleRightPanel);
	const rightCollapsed = useViewStore((s) => s.rightPanelCollapsed);

	useEffect(() => {
		fetchAll();
	}, []);

	return (
		<div className="border-b border-[var(--color-border-secondary)]">
			<button
				onClick={() => toggle('context')}
				className="w-full flex items-center gap-1.5 px-4 py-3 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors"
			>
				{collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
				Context
			</button>
			{!collapsed && (
				<div className="px-3 pb-3">
					{/* Selected folders */}
					<SubSection
						label="Selected folders"
						icon={Folder}
						count={folders.length}
						collapsed={!!rightCollapsed['context-folders']}
						onToggle={() => toggle('context-folders')}
					>
						{folders.map((f) => (
							<div
								key={f.path}
								className="flex items-center gap-2 px-2 py-1 text-xs text-[var(--color-text-secondary)]"
							>
								<span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-accent)]" />
								<span className="truncate">{f.name}</span>
							</div>
						))}
					</SubSection>

					{/* Connectors */}
					<SubSection
						label="Connectors"
						icon={Globe}
						count={connectors.filter((c) => c.enabled).length}
						collapsed={!!rightCollapsed['context-connectors']}
						onToggle={() => toggle('context-connectors')}
					>
						{connectors.map((c) => (
							<div
								key={c.id}
								className="flex items-center gap-2 px-2 py-1 text-xs text-[var(--color-text-secondary)]"
							>
								<span
									className={`w-1.5 h-1.5 rounded-full ${c.enabled ? 'bg-green-500' : 'bg-[var(--color-text-tertiary)]'}`}
								/>
								<span className="truncate">{c.name}</span>
							</div>
						))}
					</SubSection>

					{/* Working files */}
					<SubSection
						label="Working files"
						icon={FileText}
						count={workingFiles.length}
						collapsed={!!rightCollapsed['context-files']}
						onToggle={() => toggle('context-files')}
					>
						{workingFiles.map((f) => (
							<div
								key={f.path}
								className="flex items-center gap-2 px-2 py-1 text-xs text-[var(--color-text-secondary)]"
							>
								<FileText className="w-3 h-3 text-[var(--color-text-tertiary)]" />
								<span className="truncate">{f.name}</span>
							</div>
						))}
					</SubSection>
				</div>
			)}
		</div>
	);
}
