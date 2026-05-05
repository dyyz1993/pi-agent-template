import { Folder, GitBranch, Search, MessageSquare, Rss, Bug } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSidebarStore, type SidebarPanelId } from "../../stores/use-sidebar-store";

const items: { id: SidebarPanelId; icon: typeof Folder; labelKey: string }[] = [
  { id: "explorer", icon: Folder, labelKey: "sidebar.explorer" },
  { id: "git", icon: GitBranch, labelKey: "sidebar.git" },
  { id: "search", icon: Search, labelKey: "sidebar.search" },
  { id: "chat", icon: MessageSquare, labelKey: "tabs.chat" },
  { id: "feed", icon: Rss, labelKey: "tabs.feed" },
  { id: "debug", icon: Bug, labelKey: "tabs.debug" },
];

export function ActivityBar() {
  const { t } = useTranslation();
  const activePanel = useSidebarStore((s) => s.activePanel);
  const togglePanel = useSidebarStore((s) => s.togglePanel);

  return (
    <div className="w-12 bg-[var(--color-bg-primary)] border-r border-[var(--color-border-primary)] flex flex-col items-center py-2 gap-1 flex-shrink-0">
      {items.map(({ id, icon: Icon, labelKey }) => (
        <button
          key={id}
          title={t(labelKey)}
          onClick={() => togglePanel(id)}
          className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
            activePanel === id
              ? "bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border-l-2 border-[var(--color-text-primary)]"
              : "text-[var(--color-text-placeholder)] hover:text-[var(--color-text-secondary)]"
          }`}
        >
          <Icon className="w-5 h-5" />
        </button>
      ))}
    </div>
  );
}

export { items };
