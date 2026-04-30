import { MessageSquare } from "lucide-react";

const items: { id: string; icon: typeof MessageSquare; label: string }[] = [
  { id: "chat", icon: MessageSquare, label: "Chat" },
];

export function ActivityBar() {
  return (
    <div className="w-12 bg-gray-900 border-r border-gray-700 flex flex-col items-center py-2 gap-1 flex-shrink-0">
      {items.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          title={label}
          className="w-10 h-10 flex items-center justify-center rounded transition-colors text-indigo-400 bg-gray-700 border-l-2 border-white"
        >
          <Icon className="w-5 h-5" />
        </button>
      ))}
    </div>
  );
}

export { items };
