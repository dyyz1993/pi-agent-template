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
    <div className="w-12 bg-gray-900 border-r border-gray-700 flex flex-col items-center py-2 gap-1 flex-shrink-0">
      {items.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          title={label}
          onClick={() => togglePanel(id)}
          className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
            activePanel === id
              ? "bg-gray-700 text-white border-l-2 border-white"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          <Icon className="w-5 h-5" />
        </button>
      ))}
    </div>
  );
}
