import { memo, useEffect, useCallback } from "react";
import { GitBranch, RefreshCw, FileQuestion, Plus, Minus, Pencil } from "lucide-react";
import { useGitStore, type GitFileChange } from "../../stores/use-git-store";
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

/* Extracted FileItem to module level with React.memo */
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

export function GitPanel() {
  const branch = useGitStore((s) => s.branch);
  const ahead = useGitStore((s) => s.ahead);
  const behind = useGitStore((s) => s.behind);
  const staged = useGitStore((s) => s.staged);
  const changed = useGitStore((s) => s.changed);
  const untracked = useGitStore((s) => s.untracked);
  const currentDiff = useGitStore((s) => s.currentDiff);
  const fetchStatus = useGitStore((s) => s.fetchStatus);
  const fetchDiff = useGitStore((s) => s.fetchDiff);

  const currentPath = useExplorerStore((s) => s.currentPath);

  const refresh = useCallback(() => {
    fetchStatus(currentPath);
  }, [fetchStatus, currentPath]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleFileClick = useCallback((filePath: string, staged?: boolean) => {
    fetchDiff(currentPath, filePath, staged);
  }, [fetchDiff, currentPath]);

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

        {totalChanges === 0 && (
          <div className="text-gray-500 text-xs text-center py-8">
            No changes detected
          </div>
        )}
      </div>
    </div>
  );
}
