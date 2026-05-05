import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useGitStore } from "../../stores/use-git-store";
import { useExplorerStore } from "../../stores/use-explorer-store";

export function GitCommitInput() {
  const { t } = useTranslation();
  const { staged, loadingAction } = useGitStore(
    useShallow((s) => ({
      staged: s.staged,
      loadingAction: s.loadingAction,
    }))
  );
  const commit = useGitStore((s) => s.commit);
  const currentPath = useExplorerStore((s) => s.currentPath);

  const [message, setMessage] = useState("");

  const handleSubmit = useCallback(() => {
    const trimmed = message.trim();
    if (!trimmed || staged.length === 0) return;
    commit(currentPath, trimmed);
    setMessage("");
  }, [message, staged.length, commit, currentPath]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  if (staged.length === 0) return null;

  const isCommitting = loadingAction === "commit";

  return (
    <div className="p-2 border-b border-[var(--color-border-primary)]">
      <textarea
        className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border-secondary)] rounded px-2 py-1.5 text-xs text-[var(--color-text-secondary)] placeholder-[var(--color-text-placeholder)] resize-none outline-none focus:border-[var(--color-accent)] transition-colors"
        rows={3}
        placeholder={t("git.commitPlaceholder")}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isCommitting}
      />
      <button
        className="mt-1.5 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-primary)]"
        onClick={handleSubmit}
        disabled={!message.trim() || isCommitting}
      >
        <Check className="w-3 h-3" />
        {isCommitting ? t("git.committing") : t("git.commit")}
      </button>
    </div>
  );
}
