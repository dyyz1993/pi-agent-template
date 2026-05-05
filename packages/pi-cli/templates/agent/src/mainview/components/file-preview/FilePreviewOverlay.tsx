import { FileText, X } from "lucide-react";
import type { FilePreview } from "../../types";
import { formatSize } from "../../utils/file-utils";
import { VirtualizedCodeView } from "./VirtualizedCodeView";

interface FilePreviewOverlayProps {
  preview: FilePreview;
  loading: boolean;
  onClose: () => void;
}

export function FilePreviewOverlay({ preview, loading, onClose }: FilePreviewOverlayProps) {
  return (
    <div className="absolute inset-0 z-10 bg-[var(--color-bg-primary)]/95 flex flex-col overflow-hidden">
      {/* File header with close button */}
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border-primary)] flex-shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[var(--color-text-tertiary)]" />
          <span className="text-sm font-medium text-[var(--color-text-secondary)]">{preview.name}</span>
          {preview.size > 0 && (
            <span className="text-xs text-[var(--color-text-placeholder)]">{formatSize(preview.size)}</span>
          )}
          {preview.totalLines != null && (
            <span className="text-xs text-[var(--color-text-placeholder)]">{preview.totalLines} lines</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] p-1 rounded hover:bg-[var(--color-bg-hover)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* File content — flex-col so VirtualizedCodeView's flex-1 works */}
      <div className="flex-1 min-h-0 flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center h-full text-[var(--color-text-tertiary)] text-sm">
            <div className="w-5 h-5 border-2 border-[var(--color-text-accent)] border-t-transparent rounded-full animate-spin mr-2" />
            Loading...
          </div>
        ) : preview.isImage && preview.imageUrl ? (
          <div className="flex items-center justify-center h-full p-4 bg-[#1a1a2e]">
            <img
              src={preview.imageUrl}
              alt={preview.name}
              className="max-w-full max-h-full object-contain rounded"
            />
          </div>
        ) : preview.content ? (
          <VirtualizedCodeView code={preview.content} filename={preview.name} />
        ) : null}
      </div>
    </div>
  );
}
