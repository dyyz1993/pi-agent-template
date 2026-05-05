import { useTranslation } from "react-i18next";
import { Folder, GitBranch, Search, Shield } from "lucide-react";
import { useSidebarStore, type SidebarPanelId } from "../../stores/use-sidebar-store";

export function ActivityBar() {
  const { t } = useTranslation();
  const activePanel = useSidebarStore((s) => s.activePanel);
  const togglePanel = useSidebarStore((s) => s.togglePanel);

  const items: { id: SidebarPanelId; icon: typeof Folder; label: string }[] = [
    { id: "explorer", icon: Folder, label: t("sidebar.explorer") },
    { id: "git", icon: GitBranch, label: t("sidebar.git") },
    { id: "search", icon: Search, label: t("sidebar.search") },
    { id: "rules", icon: Shield, label: t("sidebar.rules") },
  ];

  return (
    <div data-testid="activity-bar" className="w-12 bg-[var(--color-bg-primary)] border-r border-[var(--color-border-primary)] flex flex-col items-center py-2 gap-1 flex-shrink-0">
      {items.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          title={label}
          data-testid={`tab-${id}`}
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
