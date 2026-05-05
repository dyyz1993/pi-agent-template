import { useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";

interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, onConfirm, onCancel }: ConfirmDialogProps) {
  const { t } = useTranslation();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    },
    [onCancel],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-secondary)] rounded-lg shadow-2xl p-4 min-w-[300px] max-w-[400px]">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">{title}</h3>
        <p className="text-xs text-[var(--color-text-secondary)] mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            className="px-3 py-1.5 text-xs bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-active)] rounded transition-colors text-[var(--color-text-secondary)]"
            onClick={onCancel}
          >
            {t("common.cancel")}
          </button>
          <button
            className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 rounded transition-colors text-white"
            onClick={onConfirm}
          >
            {t("common.delete")}
          </button>
        </div>
      </div>
    </div>
  );
}
