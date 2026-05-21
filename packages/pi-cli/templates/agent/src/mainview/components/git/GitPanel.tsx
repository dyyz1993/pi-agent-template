import { memo, useEffect, useCallback, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import {
	GitBranch,
	RefreshCw,
	FileQuestion,
	Plus,
	Minus,
	Pencil,
	ChevronRight,
	ChevronDown,
	Eye,
	FileText,
	Copy,
	Upload,
	Download,
	ChevronUp,
	ChevronDown as BranchChevron,
	FolderTree,
} from "lucide-react";
import { useGitStore, type GitFileChange, type GitCommit } from "../../stores/use-git-store";
import { useExplorerStore } from "../../stores/use-explorer-store";
import { ContextMenu, type MenuItem } from "../explorer/ContextMenu";
import { GitCommitInput } from "./GitCommitInput";
import { GitBranchSelector } from "./GitBranchSelector";
import { PinButton } from "../sidebar/PinButton";

function statusIcon(status: GitFileChange["status"]) {
	switch (status) {
		case "added":
			return <Plus className="w-3 h-3 text-[var(--color-text-success)]" />;
		case "deleted":
			return <Minus className="w-3 h-3 text-[var(--color-text-error)]" />;
		case "modified":
			return <Pencil className="w-3 h-3 text-[var(--color-text-warning)]" />;
		default:
			return <FileQuestion className="w-3 h-3 text-[var(--color-text-tertiary)]" />;
	}
}

function statusLabel(status: GitFileChange["status"]) {
	switch (status) {
		case "added":
			return "A";
		case "deleted":
			return "D";
		case "modified":
			return "M";
		case "renamed":
			return "R";
		case "copied":
			return "C";
	}
}

interface FileItemProps {
	path: string;
	status: GitFileChange["status"];
	isSelected: boolean;
	isStaged?: boolean;
	onClick: (filePath: string, staged?: boolean) => void;
	onContextMenu: (e: React.MouseEvent, filePath: string, isStaged?: boolean) => void;
	onStageToggle: (filePath: string, isStaged?: boolean) => void;
	stageTitle: string;
	unstageTitle: string;
}

const FileItem = memo(function FileItem({
	path,
	status,
	isSelected,
	isStaged,
	onClick,
	onContextMenu,
	onStageToggle,
	stageTitle,
	unstageTitle,
}: FileItemProps) {
	return (
		<div
			className={`group flex items-center gap-1.5 px-2 py-0.5 text-xs rounded cursor-pointer transition-colors ${
				isSelected
					? "bg-[var(--color-accent)]/30 text-[var(--color-text-primary)]"
					: "hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]"
			}`}
			onClick={() => onClick(path, isStaged)}
			onContextMenu={(e) => {
				e.preventDefault();
				onContextMenu(e, path, isStaged);
			}}
		>
			{statusIcon(status)}
			<span className="truncate flex-1">{path.split("/").pop()}</span>
			<span className="text-[var(--color-text-placeholder)] text-[10px]">
				{statusLabel(status)}
			</span>
			<button
				className={`opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-[var(--color-bg-active)] ${
					isStaged
						? "text-[var(--color-text-warning)] hover:text-[var(--color-text-warning)]"
						: "text-[var(--color-text-success)] hover:text-[var(--color-text-success)]"
				}`}
				onClick={(e) => {
					e.stopPropagation();
					onStageToggle(path, isStaged);
				}}
				title={isStaged ? unstageTitle : stageTitle}
			>
				{isStaged ? <ChevronUp className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
			</button>
		</div>
	);
});

interface UntrackedItemProps {
	path: string;
	isSelected: boolean;
	onClick: (filePath: string) => void;
	onContextMenu: (e: React.MouseEvent, filePath: string) => void;
	onStage: (filePath: string) => void;
	stageTitle: string;
}

const UntrackedItem = memo(function UntrackedItem({
	path,
	isSelected,
	onClick,
	onContextMenu,
	onStage,
	stageTitle,
}: UntrackedItemProps) {
	return (
		<div
			className={`group flex items-center gap-1.5 px-2 py-0.5 text-xs rounded cursor-pointer transition-colors ${
				isSelected
					? "bg-[var(--color-accent)]/30 text-[var(--color-text-primary)]"
					: "hover:bg-[var(--color-bg-hover)] text-[var(--color-text-tertiary)]"
			}`}
			onClick={() => onClick(path)}
			onContextMenu={(e) => {
				e.preventDefault();
				onContextMenu(e, path);
			}}
		>
			<FileQuestion className="w-3 h-3 text-[var(--color-text-placeholder)]" />
			<span className="truncate flex-1">{path.split("/").pop()}</span>
			<span className="text-[var(--color-text-tertiary)] text-[10px]">U</span>
			<button
				className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-[var(--color-text-success)] hover:text-[var(--color-text-success)] hover:bg-[var(--color-bg-active)]"
				onClick={(e) => {
					e.stopPropagation();
					onStage(path);
				}}
				title={stageTitle}
			>
				<Plus className="w-3 h-3" />
			</button>
		</div>
	);
});

interface CommitFileItemProps {
	path: string;
	status: GitFileChange["status"];
	isSelected: boolean;
	onClick: () => void;
}

const CommitFileItem = memo(function CommitFileItem({
	path,
	status,
	isSelected,
	onClick,
}: CommitFileItemProps) {
	return (
		<div
			className={`flex items-center gap-1.5 pl-7 pr-2 py-0.5 text-xs rounded cursor-pointer transition-colors ${
				isSelected
					? "bg-[var(--color-accent)]/30 text-[var(--color-text-primary)]"
					: "hover:bg-[var(--color-bg-hover)] text-[var(--color-text-tertiary)]"
			}`}
			onClick={onClick}
		>
			{statusIcon(status)}
			<span className="truncate flex-1">{path.split("/").pop()}</span>
			<span className="text-[var(--color-text-tertiary)] text-[10px]">{statusLabel(status)}</span>
		</div>
	);
});

interface CommitItemProps {
	commit: GitCommit;
	expanded: boolean;
	files: GitFileChange[] | undefined;
	loading: boolean;
	selectedFilePath: string | null;
	onToggle: () => void;
	onFileClick: (filePath: string) => void;
	onContextMenu: (e: React.MouseEvent, commit: GitCommit) => void;
	t: (key: string) => string;
}

function relativeTime(
	dateStr: string,
	t: (key: string, options?: Record<string, unknown>) => string
): string {
	const d = new Date(dateStr);
	const now = new Date();
	const diff = now.getTime() - d.getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return t("git.justNow");
	if (mins < 60) return t("git.minutesAgo", { count: mins });
	const hours = Math.floor(mins / 60);
	if (hours < 24) return t("git.hoursAgo", { count: hours });
	const days = Math.floor(hours / 24);
	if (days < 30) return t("git.daysAgo", { count: days });
	return d.toLocaleDateString();
}

const CommitItem = memo(function CommitItem({
	commit,
	expanded,
	files,
	loading,
	selectedFilePath,
	onToggle,
	onFileClick,
	onContextMenu,
	t,
}: CommitItemProps) {
	return (
		<div>
			<div
				className="flex items-start gap-1.5 px-2 py-1 text-xs hover:bg-[var(--color-bg-hover)]/50 rounded cursor-pointer"
				onClick={onToggle}
				onContextMenu={(e) => {
					e.preventDefault();
					onContextMenu(e, commit);
				}}
			>
				{expanded ? (
					<ChevronDown className="w-3 h-3 text-[var(--color-text-placeholder)] mt-0.5 shrink-0" />
				) : (
					<ChevronRight className="w-3 h-3 text-[var(--color-text-placeholder)] mt-0.5 shrink-0" />
				)}
				<div className="flex-1 min-w-0">
					<div className="text-[var(--color-text-secondary)] truncate">{commit.message}</div>
					<div className="text-[var(--color-text-placeholder)] text-[10px] flex items-center gap-1.5 mt-0.5">
						<span className="text-[var(--color-text-accent)] font-mono">{commit.shortHash}</span>
						<span>{commit.author}</span>
						<span>{relativeTime(commit.date, t)}</span>
					</div>
				</div>
			</div>
			{expanded && (
				<div className="ml-1">
					{loading ? (
						<div className="text-[var(--color-text-tertiary)] text-[10px] pl-7 py-1">
							{t("git.loadingFiles")}
						</div>
					) : files && files.length > 0 ? (
						files.map((f) => (
							<CommitFileItem
								key={f.path}
								path={f.path}
								status={f.status}
								isSelected={selectedFilePath === f.path}
								onClick={() => onFileClick(f.path)}
							/>
						))
					) : (
						<div className="text-[var(--color-text-tertiary)] text-[10px] pl-7 py-1">
							{t("git.noFiles")}
						</div>
					)}
				</div>
			)}
		</div>
	);
});

interface GitPanelProps {
	hideOuterShell?: boolean;
}

export function GitPanel({ hideOuterShell }: GitPanelProps) {
	const { t } = useTranslation();

	const { branch, ahead, behind } = useGitStore(
		useShallow((s) => ({
			branch: s.branch,
			ahead: s.ahead,
			behind: s.behind,
		}))
	);

	const { staged, changed, untracked } = useGitStore(
		useShallow((s) => ({
			staged: s.staged,
			changed: s.changed,
			untracked: s.untracked,
		}))
	);

	const {
		commits,
		loadingCommits,
		currentDiff,
		expandedCommits,
		commitFiles,
		loadingCommitFiles,
		loadingAction,
		worktrees,
	} = useGitStore(
		useShallow((s) => ({
			commits: s.commits,
			loadingCommits: s.loadingCommits,
			currentDiff: s.currentDiff,
			expandedCommits: s.expandedCommits,
			commitFiles: s.commitFiles,
			loadingCommitFiles: s.loadingCommitFiles,
			loadingAction: s.loadingAction,
			worktrees: s.worktrees,
		}))
	);

	const fetchStatus = useGitStore((s) => s.fetchStatus);
	const fetchDiff = useGitStore((s) => s.fetchDiff);
	const fetchLog = useGitStore((s) => s.fetchLog);
	const toggleCommitExpand = useGitStore((s) => s.toggleCommitExpand);
	const fetchCommitFileDiff = useGitStore((s) => s.fetchCommitFileDiff);
	const stageFiles = useGitStore((s) => s.stageFiles);
	const unstageFiles = useGitStore((s) => s.unstageFiles);
	const push = useGitStore((s) => s.push);
	const pull = useGitStore((s) => s.pull);
	const fetchWorktrees = useGitStore((s) => s.fetchWorktrees);

	const currentPath = useExplorerStore((s) => s.currentPath);
	const openFile = useExplorerStore((s) => s.openFile);

	const [commitsExpanded, setCommitsExpanded] = useState(false);
	const [showBranches, setShowBranches] = useState(false);
	const [showWorktrees, setShowWorktrees] = useState(false);
	const [ctxMenu, setCtxMenu] = useState<{
		x: number;
		y: number;
		filePath: string;
		isStaged?: boolean;
	} | null>(null);
	const [commitCtxMenu, setCommitCtxMenu] = useState<{
		x: number;
		y: number;
		commit: GitCommit;
	} | null>(null);

	const branchBtnRef = useRef<HTMLButtonElement>(null);

	const refresh = useCallback(() => {
		fetchStatus(currentPath);
		fetchWorktrees(currentPath);
		if (commitsExpanded) fetchLog(currentPath);
	}, [fetchStatus, fetchWorktrees, fetchLog, currentPath, commitsExpanded]);

	useEffect(() => {
		refresh();
	}, [refresh]);

	const handleFileClick = useCallback(
		(filePath: string, staged?: boolean) => {
			fetchDiff(currentPath, filePath, staged);
		},
		[fetchDiff, currentPath]
	);

	const handleContextMenu = useCallback(
		(e: React.MouseEvent, filePath: string, isStaged?: boolean) => {
			setCtxMenu({ x: e.clientX, y: e.clientY, filePath, isStaged });
		},
		[]
	);

	const handleOpenFile = useCallback(
		(filePath: string) => {
			const fullPath = `${currentPath}/${filePath}`;
			openFile({
				name: filePath.split("/").pop() || filePath,
				path: fullPath,
				type: "file" as const,
			});
		},
		[openFile, currentPath]
	);

	const handleCopyPath = useCallback(
		async (filePath: string) => {
			await navigator.clipboard.writeText(`${currentPath}/${filePath}`);
		},
		[currentPath]
	);

	const getContextMenuItems = useCallback(
		(filePath: string, isStaged?: boolean): MenuItem[] => [
			{
				label: t("git.openDiff"),
				icon: <Eye className="w-3 h-3" />,
				onClick: () => fetchDiff(currentPath, filePath, isStaged),
			},
			{
				label: t("git.openFile"),
				icon: <FileText className="w-3 h-3" />,
				onClick: () => handleOpenFile(filePath),
			},
			{ label: "", onClick: () => {}, divider: true },
			{
				label: t("git.copyPath"),
				icon: <Copy className="w-3 h-3" />,
				onClick: () => handleCopyPath(filePath),
			},
		],
		[fetchDiff, currentPath, handleOpenFile, handleCopyPath, t]
	);

	const handleCommitContextMenu = useCallback((e: React.MouseEvent, commit: GitCommit) => {
		setCommitCtxMenu({ x: e.clientX, y: e.clientY, commit });
	}, []);

	const getCommitContextMenuItems = useCallback(
		(commit: GitCommit): MenuItem[] => [
			{
				label: t("git.copyHash"),
				icon: <Copy className="w-3 h-3" />,
				onClick: () => navigator.clipboard.writeText(commit.hash),
			},
			{
				label: t("git.copyMessage"),
				icon: <Copy className="w-3 h-3" />,
				onClick: () => navigator.clipboard.writeText(commit.message),
			},
		],
		[t]
	);

	const handleCommitFileClick = useCallback(
		(hash: string, filePath: string) => {
			fetchCommitFileDiff(currentPath, hash, filePath);
		},
		[fetchCommitFileDiff, currentPath]
	);

	const handleStageToggle = useCallback(
		(filePath: string, isStaged?: boolean) => {
			if (isStaged) {
				unstageFiles(currentPath, [filePath]);
			} else {
				stageFiles(currentPath, [filePath]);
			}
		},
		[stageFiles, unstageFiles, currentPath]
	);

	const handleStageAll = useCallback(() => {
		const paths = [...changed.map((f) => f.path), ...untracked];
		if (paths.length > 0) stageFiles(currentPath, paths);
	}, [changed, untracked, stageFiles, currentPath]);

	const handleUnstageAll = useCallback(() => {
		const paths = staged.map((f) => f.path);
		if (paths.length > 0) unstageFiles(currentPath, paths);
	}, [staged, unstageFiles, currentPath]);

	const handleUntrackedStage = useCallback(
		(filePath: string) => {
			stageFiles(currentPath, [filePath]);
		},
		[stageFiles, currentPath]
	);

	const toggleCommits = useCallback(() => {
		const next = !commitsExpanded;
		setCommitsExpanded(next);
		if (next && commits.length === 0) fetchLog(currentPath);
	}, [commitsExpanded, commits.length, fetchLog, currentPath]);

	const handlePush = useCallback(() => push(currentPath), [push, currentPath]);
	const handlePull = useCallback(() => pull(currentPath), [pull, currentPath]);

	const totalChanges = staged.length + changed.length + untracked.length;
	const selectedFilePath = currentDiff?.filePath ?? null;
	const hasMultipleWorktrees = worktrees.length > 1;

	const pinButton = <PinButton />;

	const panelContent = (
		<>
			<div className="px-3 py-2 text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide border-b border-[var(--color-border-primary)] flex items-center gap-1.5">
				<GitBranch className="w-3.5 h-3.5" />
				{t("git.title")}
				<span className="ml-auto flex items-center gap-1">
					{totalChanges > 0 && (
						<span className="bg-[var(--color-accent)] text-[var(--color-text-primary)] px-1.5 py-0.5 rounded-full text-[10px] leading-none">
							{totalChanges}
						</span>
					)}
					{pinButton}
					<button
						onClick={handlePull}
						className="text-[var(--color-text-placeholder)] hover:text-[var(--color-text-primary)]"
						disabled={loadingAction === "pull"}
						title={t("git.pull")}
					>
						<Download className="w-3 h-3" />
					</button>
					<button
						onClick={handlePush}
						className="text-[var(--color-text-placeholder)] hover:text-[var(--color-text-primary)]"
						disabled={loadingAction === "push"}
						title={t("git.push")}
					>
						<Upload className="w-3 h-3" />
					</button>
					<button
						onClick={refresh}
						className="text-[var(--color-text-placeholder)] hover:text-[var(--color-text-primary)]"
						title={t("git.refresh")}
					>
						<RefreshCw className="w-3 h-3" />
					</button>
				</span>
			</div>

			<div className="px-2 py-1.5 text-xs text-[var(--color-text-tertiary)] flex items-center gap-1.5 border-b border-[var(--color-border-primary)]/50">
				<button
					ref={branchBtnRef}
					className="flex items-center gap-1 hover:text-[var(--color-text-primary)] transition-colors"
					onClick={() => setShowBranches(!showBranches)}
				>
					<GitBranch className="w-3 h-3" />
					<span className="font-medium">{branch}</span>
					{ahead > 0 && <span className="text-[var(--color-text-success)]">↑{ahead}</span>}
					{behind > 0 && <span className="text-[var(--color-text-warning)]">↓{behind}</span>}
					<BranchChevron className="w-3 h-3 text-[var(--color-text-placeholder)]" />
				</button>

				{hasMultipleWorktrees && (
					<button
						className="ml-auto text-[var(--color-text-placeholder)] hover:text-[var(--color-text-primary)] transition-colors"
						onClick={() => setShowWorktrees(!showWorktrees)}
						title={`${worktrees.length} worktrees`}
					>
						<FolderTree className="w-3 h-3" />
					</button>
				)}
			</div>

			<GitCommitInput />

			<div className="flex-1 overflow-y-auto p-1">
				{staged.length > 0 && (
					<div className="mt-1">
						<div className="px-2 py-1 text-[10px] uppercase tracking-wide text-[var(--color-text-placeholder)] font-semibold flex items-center">
							<span>
								{t("git.staged")} ({staged.length})
							</span>
							<button
								className="ml-auto text-[var(--color-text-warning)] hover:text-[var(--color-text-warning)]"
								onClick={handleUnstageAll}
								title={t("git.unstageAll")}
							>
								<ChevronUp className="w-3 h-3" />
							</button>
						</div>
						{staged.map((f) => (
							<FileItem
								key={f.path}
								path={f.path}
								status={f.status}
								isSelected={selectedFilePath === f.path}
								isStaged
								onClick={handleFileClick}
								onContextMenu={handleContextMenu}
								onStageToggle={handleStageToggle}
								stageTitle={t("git.stage")}
								unstageTitle={t("git.unstage")}
							/>
						))}
					</div>
				)}

				{changed.length > 0 && (
					<div className="mt-2">
						<div className="px-2 py-1 text-[10px] uppercase tracking-wide text-[var(--color-text-placeholder)] font-semibold flex items-center">
							<span>
								{t("git.changes")} ({changed.length})
							</span>
							<button
								className="ml-auto text-[var(--color-text-success)] hover:text-[var(--color-text-success)]"
								onClick={handleStageAll}
								title={t("git.stageAll")}
							>
								<Plus className="w-3 h-3" />
							</button>
						</div>
						{changed.map((f) => (
							<FileItem
								key={f.path}
								path={f.path}
								status={f.status}
								isSelected={selectedFilePath === f.path}
								onClick={handleFileClick}
								onContextMenu={handleContextMenu}
								onStageToggle={handleStageToggle}
								stageTitle={t("git.stage")}
								unstageTitle={t("git.unstage")}
							/>
						))}
					</div>
				)}

				{untracked.length > 0 && (
					<div className="mt-2">
						<div className="px-2 py-1 text-[10px] uppercase tracking-wide text-[var(--color-text-placeholder)] font-semibold">
							{t("git.untracked")} ({untracked.length})
						</div>
						{untracked.map((f) => (
							<UntrackedItem
								key={f}
								path={f}
								isSelected={selectedFilePath === f}
								onClick={handleFileClick}
								onContextMenu={handleContextMenu}
								onStage={handleUntrackedStage}
								stageTitle={t("git.stage")}
							/>
						))}
					</div>
				)}

				{totalChanges === 0 && !commitsExpanded && (
					<div className="text-[var(--color-text-placeholder)] text-xs text-center py-8">
						{t("git.noChanges")}
					</div>
				)}

				<div className="mt-2 border-t border-[var(--color-border-primary)] pt-1">
					<button
						className="w-full px-2 py-1 text-[10px] uppercase tracking-wide text-[var(--color-text-placeholder)] font-semibold flex items-center gap-1 hover:text-[var(--color-text-secondary)] transition-colors"
						onClick={toggleCommits}
					>
						{commitsExpanded ? (
							<ChevronDown className="w-3 h-3" />
						) : (
							<ChevronRight className="w-3 h-3" />
						)}
						{t("git.commits")}
						{commits.length > 0 && (
							<span className="text-[var(--color-text-tertiary)] ml-auto">{commits.length}</span>
						)}
					</button>
					{commitsExpanded && (
						<div className="mt-0.5">
							{loadingCommits ? (
								<div className="text-[var(--color-text-placeholder)] text-xs text-center py-4">
									{t("common.loading")}
								</div>
							) : commits.length === 0 ? (
								<div className="text-[var(--color-text-tertiary)] text-xs text-center py-4">
									{t("git.noCommits")}
								</div>
							) : (
								commits.map((c) => (
									<CommitItem
										key={c.hash}
										commit={c}
										expanded={expandedCommits.has(c.hash)}
										files={commitFiles[c.hash]}
										loading={loadingCommitFiles.has(c.hash)}
										selectedFilePath={selectedFilePath}
										onToggle={() => toggleCommitExpand(currentPath, c.hash)}
										onFileClick={(fp) => handleCommitFileClick(c.hash, fp)}
										onContextMenu={handleCommitContextMenu}
										t={t}
									/>
								))
							)}
						</div>
					)}
				</div>
			</div>

			{showBranches && branchBtnRef.current && (
				<div
					className="absolute z-50"
					style={{
						top: branchBtnRef.current.getBoundingClientRect().bottom + 4,
						left: branchBtnRef.current.getBoundingClientRect().left,
					}}
				>
					<GitBranchSelector onClose={() => setShowBranches(false)} />
				</div>
			)}

			{showWorktrees && worktrees.length > 1 && (
				<div
					className="fixed z-50 min-w-[200px] bg-[var(--color-bg-secondary)] border border-[var(--color-border-secondary)] rounded-md shadow-xl py-1"
					style={{ top: 80, left: 48 }}
				>
					<div className="px-3 py-1 text-[10px] uppercase tracking-wide text-[var(--color-text-placeholder)] font-semibold">
						{t("git.worktrees")}
					</div>
					{worktrees.map((wt) => (
						<div
							key={wt.path}
							className={`px-3 py-1.5 text-xs flex items-center gap-2 ${
								wt.path === currentPath
									? "text-[var(--color-text-accent)]"
									: "text-[var(--color-text-secondary)]"
							}`}
						>
							<FolderTree className="w-3 h-3 shrink-0" />
							<div className="min-w-0 flex-1">
								<div className="truncate">{wt.branch}</div>
								<div className="text-[var(--color-text-placeholder)] text-[10px] truncate">
									{wt.path}
								</div>
							</div>
							{wt.isMain && (
								<span className="text-[var(--color-text-tertiary)] text-[10px]">main</span>
							)}
						</div>
					))}
					<button
						className="w-full text-left px-3 py-1 text-[10px] text-[var(--color-text-placeholder)] hover:text-[var(--color-text-secondary)] border-t border-[var(--color-border-primary)] mt-1 pt-1"
						onClick={() => setShowWorktrees(false)}
					>
						{t("git.close")}
					</button>
				</div>
			)}

			{ctxMenu && (
				<ContextMenu
					x={ctxMenu.x}
					y={ctxMenu.y}
					items={getContextMenuItems(ctxMenu.filePath, ctxMenu.isStaged)}
					onClose={() => setCtxMenu(null)}
				/>
			)}
			{commitCtxMenu && (
				<ContextMenu
					x={commitCtxMenu.x}
					y={commitCtxMenu.y}
					items={getCommitContextMenuItems(commitCtxMenu.commit)}
					onClose={() => setCommitCtxMenu(null)}
				/>
			)}
		</>
	);

	if (hideOuterShell) {
		return <div className="flex flex-col flex-1 overflow-hidden">{panelContent}</div>;
	}

	return (
		<div className="w-60 bg-[var(--color-bg-primary)] flex flex-col flex-shrink-0 overflow-hidden">
			{panelContent}
		</div>
	);
}
