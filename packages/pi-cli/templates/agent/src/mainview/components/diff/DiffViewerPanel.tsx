import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Columns2, Rows3 } from "lucide-react";
import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";
import { useGitStore } from "../../stores/use-git-store";

const DIFF_STYLES = {
  variables: {
    light: {
      diffViewerBackground: "#111827",
    },
    dark: {
      diffViewerBackground: "#111827",
      diffViewerColor: "#e5e7eb",
      addedBackground: "#052e16",
      addedColor: "#4ade80",
      removedBackground: "#450a0a",
      removedColor: "#fca5a5",
      wordAddedBackground: "#065f46",
      wordRemovedBackground: "#7f1d1d",
      addedGutterBackground: "#052e16",
      removedGutterBackground: "#450a0a",
      gutterBackground: "#1f2937",
      gutterColor: "#6b7280",
      codeFoldGutterBackground: "#1f2937",
      codeFoldBackground: "#1f2937",
      emptyLineBackground: "#111827",
      gutterBackgroundDark: "#1f2937",
      highlightGutterBackground: "#374151",
      highlightBackground: "#374151",
    },
  },
  line: {
    fontSize: "12px",
    fontFamily: "ui-monospace, SFMono-Regular, monospace",
    lineHeight: "1.6",
  },
  gutter: {
    fontSize: "12px",
    fontFamily: "ui-monospace, SFMono-Regular, monospace",
    minWidth: "40px",
    padding: "0 8px",
  },
} as const;

export function DiffViewerPanel() {
  const { t } = useTranslation();
  const currentDiff = useGitStore((s) => s.currentDiff);
  const loadingDiff = useGitStore((s) => s.loadingDiff);
  const clearDiff = useGitStore((s) => s.clearDiff);
  const [splitView, setSplitView] = useState(false);

  if (!currentDiff && !loadingDiff) return null;

  const fileName = currentDiff?.filePath.split("/").pop() || "";

  return (
    <div className="absolute inset-0 bg-[var(--color-bg-primary)] flex flex-col" style={{ zIndex: 40 }}>
      <div className="h-9 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border-primary)] flex items-center px-3 text-xs flex-shrink-0 gap-2">
        <span className="text-[var(--color-text-secondary)] font-medium">{fileName}</span>
        <span className="text-[var(--color-text-placeholder)] truncate text-[10px]">{currentDiff?.filePath}</span>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setSplitView(false)}
            className={`p-1 rounded transition-colors ${!splitView ? "bg-[var(--color-bg-input)] text-[var(--color-text-primary)]" : "text-[var(--color-text-placeholder)] hover:text-[var(--color-text-primary)]"}`}
            title={t("diff.lineByLine")}
          >
            <Rows3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setSplitView(true)}
            className={`p-1 rounded transition-colors ${splitView ? "bg-[var(--color-bg-input)] text-[var(--color-text-primary)]" : "text-[var(--color-text-placeholder)] hover:text-[var(--color-text-primary)]"}`}
            title={t("diff.sideBySide")}
          >
            <Columns2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={clearDiff}
            className="ml-1 text-[var(--color-text-placeholder)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loadingDiff ? (
          <div className="flex items-center justify-center h-full text-[var(--color-text-placeholder)]">
            {t("diff.loading")}
          </div>
        ) : currentDiff ? (
          <ReactDiffViewer
            oldValue={currentDiff.oldContent}
            newValue={currentDiff.newContent}
            splitView={splitView}
            compareMethod={DiffMethod.LINES}
            useDarkTheme={true}
            leftTitle={t("diff.before")}
            rightTitle={t("diff.after")}
            styles={DIFF_STYLES}
          />
        ) : null}
      </div>
    </div>
  );
}
