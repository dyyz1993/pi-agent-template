import { useTranslation } from "react-i18next";
import { Folder, GitBranch, Search, Shield } from "lucide-react";
import { useSidebarStore, type SidebarPanelId } from "../../stores/use-sidebar-store";

export function MobileTabBar() {
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
    <div data-testid="mobile-tab-bar" className="h-14 bg-[var(--color-bg-primary)] border-t border-[var(--color-border-primary)] flex items-center justify-around flex-shrink-0">
      {items.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          data-testid={`tab-${id}`}
          onClick={() => togglePanel(id)}
          className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded transition-colors ${
            activePanel === id
              ? "text-[var(--color-text-accent)]"
              : "text-[var(--color-text-placeholder)] hover:text-[var(--color-text-secondary)]"
          }`}
        >
          <Icon className="w-5 h-5" />
          <span className="text-[10px]">{label}</span>
        </button>
      ))}
    </div>
  );
}
