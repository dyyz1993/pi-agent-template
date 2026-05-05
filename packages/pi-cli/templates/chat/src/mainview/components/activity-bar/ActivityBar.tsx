import { MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";

const items: { id: string; icon: typeof MessageSquare; labelKey: string }[] = [
  { id: "chat", icon: MessageSquare, labelKey: "tabs.chat" },
];

export function ActivityBar() {
  const { t } = useTranslation();

  return (
    <div className="w-12 bg-[var(--color-bg-primary)] border-r border-[var(--color-border-primary)] flex flex-col items-center py-2 gap-1 flex-shrink-0">
      {items.map(({ id, icon: Icon, labelKey }) => (
        <button
          key={id}
          title={t(labelKey)}
          className="w-10 h-10 flex items-center justify-center rounded transition-colors text-[var(--color-text-accent)] bg-[var(--color-bg-tertiary)] border-l-2 border-[var(--color-text-primary)]"
        >
          <Icon className="w-5 h-5" />
        </button>
      ))}
    </div>
  );
}

export { items };
