import { useState, useEffect } from "react";
import { Plus, Trash2, Circle, Clock, CheckCircle2 } from "lucide-react";
import { useTodoStore } from "../../stores/use-todo-store";
import type { TodoStatus } from "../../../shared/modules/todo";

const statusIcons: Record<TodoStatus, typeof Circle> = {
  pending: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
};

const statusColors: Record<TodoStatus, string> = {
  pending: "text-gray-500",
  in_progress: "text-yellow-400",
  completed: "text-green-400",
};

const nextStatus: Record<TodoStatus, TodoStatus> = {
  pending: "in_progress",
  in_progress: "completed",
  completed: "pending",
};

export function TodoPanel() {
  const [showInput, setShowInput] = useState(false);
  const [input, setInput] = useState("");
  const items = useTodoStore((s) => s.items);
  const fetchItems = useTodoStore((s) => s.fetchItems);
  const addItem = useTodoStore((s) => s.addItem);
  const updateItem = useTodoStore((s) => s.updateItem);
  const removeItem = useTodoStore((s) => s.removeItem);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleAdd = () => {
    if (!input.trim()) return;
    addItem(input.trim());
    setInput("");
    setShowInput(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
    if (e.key === "Escape") setShowInput(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-700 flex items-center justify-between">
        <span className="text-sm text-gray-300">Todo</span>
        <button
          onClick={() => setShowInput(!showInput)}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 rounded text-white"
        >
          <Plus className="w-3 h-3" />
          Add Todo
        </button>
      </div>

      {showInput && (
        <div className="p-3 border-b border-gray-700 bg-gray-800 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What needs to be done?"
            autoFocus
            className="flex-1 bg-gray-900 text-gray-100 px-3 py-1.5 rounded text-sm border border-gray-600 focus:border-indigo-500 focus:outline-none"
          />
          <button
            onClick={handleAdd}
            disabled={!input.trim()}
            className="px-3 py-1 text-xs bg-green-600 hover:bg-green-500 disabled:opacity-40 rounded text-white"
          >
            Add
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {items.length === 0 ? (
          <div className="p-4 text-gray-600 text-sm text-center">No tasks yet.</div>
        ) : (
          <div className="divide-y divide-gray-700">
            {items.map((item) => {
              const Icon = statusIcons[item.status];
              return (
                <div key={item.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-800/50 group">
                  <button
                    onClick={() => updateItem(item.id, nextStatus[item.status])}
                    className={`flex-shrink-0 ${statusColors[item.status]}`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                  <span
                    className={`flex-1 text-sm ${
                      item.status === "completed" ? "text-gray-500 line-through" : "text-gray-200"
                    }`}
                  >
                    {item.content}
                  </span>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
