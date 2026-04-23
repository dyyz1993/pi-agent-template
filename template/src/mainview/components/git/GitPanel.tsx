import { memo, useEffect, useCallback, useState } from "react";
import { GitBranch, GitCommitHorizontal, RefreshCw, FileQuestion, Plus, Minus, Pencil, ChevronRight, ChevronDown } from "lucide-react";
import { useGitStore, type GitFileChange, type GitCommit } from "../../stores/use-git-store";
import { useExplorerStore } from "../../stores/use-explorer-store";

function statusIcon(status: GitFileChange["status"]) {
  switch (status) {
    case "added": return <Plus className="w-3 h-3 text-green-400" />;
    case "deleted": return <Minus className="w-3 h-3 text-red-400" />;
    case "modified": return <Pencil className="w-3 h-3 text-yellow-400" />;
    default: return <FileQuestion className="w-3 h-3 text-gray-400" />;
  }
}

function statusLabel(status: GitFileChange["status"]) {
  switch (status) {
    case "added": return "A";
    case "deleted": return "D";
    case "modified": return "M";
    case "renamed": return "R";
    case "copied": return "C";
  }
}

function relativeTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

/* File item with React.memo */
interface FileItemProps {
  path: string;
  status: GitFileChange["status"];
  isSelected: boolean;
  isStaged?: boolean;
  onClick: (filePath: string, staged?: boolean) => void;
}

const FileItem = memo(function FileItem({ path, status, isSelected, isStaged, onClick }: FileItemProps) {
  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-0.5 text-xs rounded cursor-pointer transition-colors ${
        isSelected
          ? "bg-indigo-600/30 text-white"
          : "hover:bg-gray-700 text-gray-300"
      }`}
      onClick={() => onClick(path, isStaged)}
    >
      {statusIcon(status)}
      <span className="truncate flex-1">{path.split("/").pop()}</span>
      <span className="text-gray-500 text-[10px]">{statusLabel(status)}</span>
    </div>
  );
});

/* Untracked item */
interface UntrackedItemProps {
  path: string;
  isSelected: boolean;
  onClick: (filePath: string) => void;
}

const UntrackedItem = memo(function UntrackedItem({ path, isSelected, onClick }: UntrackedItemProps) {
  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-0.5 text-xs rounded cursor-pointer transition-colors ${
        isSelected ? "bg-indigo-600/30 text-white" : "hover:bg-gray-700 text-gray-400"
      }`}
      onClick={() => onClick(path)}
    >
      <FileQuestion className="w-3 h-3 text-gray-500" />
      <span className="truncate">{path.split("/").pop()}</span>
      <span className="text-gray-600 text-[10px]">U</span>
    </div>
  );
});

/* Commit item */
interface CommitItemProps {
  commit: GitCommit;
}

const CommitItem = memo(function CommitItem({ commit }: CommitItemProps) {
  return (
    <div className="flex items-start gap-1.5 px-2 py-1 text-xs hover:bg-gray-700/50 rounded">
      <GitCommitHorizontal className="w-3 h-3 text-gray-500 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-gray-300 truncate">{commit.message}</div>
        <div className="text-gray-500 text-[10px] flex items-center gap-1.5 mt-0.5">
          <span className="text-indigo-400 font-mono">{commit.shortHash}</span>
          <span>{commit.author}</span>
          <span>{relativeTime(commit.date)}</span>
        </div>
      </div>
    </div>
  );
});

export function GitPanel() {
  const branch = useGitStore((s) => s.branch);
  const ahead = useGitStore((s) => s.ahead);
  const behind = useGitStore((s) => s.behind);
  const staged = useGitStore((s) => s.staged);
  const changed = useGitStore((s) => s.changed);
  const untracked = useGitStore((s) => s.untracked);
  const commits = useGitStore((s) => s.commits);
  const loadingCommits = useGitStore((s) => s.loadingCommits);
  const currentDiff = useGitStore((s) => s.currentDiff);
  const fetchStatus = useGitStore((s) => s.fetchStatus);
  const fetchDiff = useGitStore((s) => s.fetchDiff);
  const fetchLog = useGitStore((s) => s.fetchLog);

  const currentPath = useExplorerStore((s) => s.currentPath);

  const [commitsExpanded, setCommitsExpanded] = useState(false);

  const refresh = useCallback(() => {
    fetchStatus(currentPath);
    if (commitsExpanded) fetchLog(currentPath);
  }, [fetchStatus, fetchLog, currentPath, commitsExpanded]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleFileClick = useCallback((filePath: string, staged?: boolean) => {
    fetchDiff(currentPath, filePath, staged);
  }, [fetchDiff, currentPath]);

  const toggleCommits = useCallback(() => {
    const next = !commitsExpanded;
    setCommitsExpanded(next);
    if (next && commits.length === 0) {
      fetchLog(currentPath);
    }
  }, [commitsExpanded, commits.length, fetchLog, currentPath]);

  const totalChanges = staged.length + changed.length + untracked.length;
  const selectedFilePath = currentDiff?.filePath ?? null;

  return (
    <div className="w-60 bg-gray-850 flex flex-col flex-shrink-0 overflow-hidden">
      <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-700 flex items-center gap-1.5">
        <GitBranch className="w-3.5 h-3.5" />
        Source Control
        <span className="ml-auto flex items-center gap-1">
          {totalChanges > 0 && (
            <span className="bg-indigo-600 text-white px-1.5 py-0.5 rounded-full text-[10px] leading-none">
              {totalChanges}
            </span>
          )}
          <button onClick={refresh} className="text-gray-500 hover:text-white">
            <RefreshCw className="w-3 h-3" />
          </button>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-1">
        {/* Branch info */}
        <div className="px-2 py-1.5 text-xs text-gray-400 flex items-center gap-1.5">
          <GitBranch className="w-3 h-3" />
          <span className="font-medium">{branch}</span>
          {ahead > 0 && <span className="text-green-400">↑{ahead}</span>}
          {behind > 0 && <span className="text-orange-400">↓{behind}</span>}
        </div>

        {/* Staged */}
        {staged.length > 0 && (
          <div className="mt-2">
            <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-gray-500 font-semibold">
              Staged Changes ({staged.length})
            </div>
            {staged.map((f) => (
              <FileItem
                key={f.path}
                path={f.path}
                status={f.status}
                isSelected={selectedFilePath === f.path}
                isStaged
                onClick={handleFileClick}
              />
            ))}
          </div>
        )}

        {/* Changed */}
        {changed.length > 0 && (
          <div className="mt-2">
            <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-gray-500 font-semibold">
              Changes ({changed.length})
            </div>
            {changed.map((f) => (
              <FileItem
                key={f.path}
                path={f.path}
                status={f.status}
                isSelected={selectedFilePath === f.path}
                onClick={handleFileClick}
              />
            ))}
          </div>
        )}

        {/* Untracked */}
        {untracked.length > 0 && (
          <div className="mt-2">
            <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-gray-500 font-semibold">
              Untracked ({untracked.length})
            </div>
            {untracked.map((f) => (
              <UntrackedItem
                key={f}
                path={f}
                isSelected={selectedFilePath === f}
                onClick={handleFileClick}
              />
            ))}
          </div>
        )}

        {totalChanges === 0 && !commitsExpanded && (
          <div className="text-gray-500 text-xs text-center py-8">
            No changes detected
          </div>
        )}

        {/* Commit History — collapsible section at bottom */}
        <div className="mt-2 border-t border-gray-700 pt-1">
          <button
            className="w-full px-2 py-1 text-[10px] uppercase tracking-wide text-gray-500 font-semibold flex items-center gap-1 hover:text-gray-300 transition-colors"
            onClick={toggleCommits}
          >
            {commitsExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            Commits
            {commits.length > 0 && (
              <span className="text-gray-600 ml-auto">{commits.length}</span>
            )}
          </button>
          {commitsExpanded && (
            <div className="mt-0.5">
              {loadingCommits ? (
                <div className="text-gray-500 text-xs text-center py-4">Loading...</div>
              ) : commits.length === 0 ? (
                <div className="text-gray-600 text-xs text-center py-4">No commits</div>
              ) : (
                commits.map((c) => (
                  <CommitItem key={c.hash} commit={c} />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
