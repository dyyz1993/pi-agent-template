import { Folder, GitBranch, Search } from "lucide-react";
import { useSidebarStore, type SidebarPanelId } from "../../stores/use-sidebar-store";

const items: { id: SidebarPanelId; icon: typeof Folder; label: string }[] = [
  { id: "explorer", icon: Folder, label: "Explorer" },
  { id: "git", icon: GitBranch, label: "Source Control" },
  { id: "search", icon: Search, label: "Search" },
];

export function MobileTabBar() {
  const activePanel = useSidebarStore((s) => s.activePanel);
  const togglePanel = useSidebarStore((s) => s.togglePanel);

  return (
    <div className="h-14 bg-gray-900 border-t border-gray-700 flex items-center justify-around flex-shrink-0">
      {items.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => togglePanel(id)}
          className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded transition-colors ${
            activePanel === id
              ? "text-indigo-400"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          <Icon className="w-5 h-5" />
          <span className="text-[10px]">{label}</span>
        </button>
      ))}
    </div>
  );
}
