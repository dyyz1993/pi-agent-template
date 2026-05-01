import { useState, useEffect } from "react";
import { Plus, Trash2, Shield, CheckCircle2, Circle } from "lucide-react";
import { useRulesStore } from "../../stores/use-rules-store";

export function RulesPanel() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [pattern, setPattern] = useState("");
  const rules = useRulesStore((s) => s.rules);
  const fetchRules = useRulesStore((s) => s.fetchRules);
  const addRule = useRulesStore((s) => s.addRule);
  const toggleRule = useRulesStore((s) => s.toggleRule);
  const removeRule = useRulesStore((s) => s.removeRule);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleAdd = () => {
    if (!name.trim() || !pattern.trim()) return;
    addRule(name.trim(), pattern.trim());
    setName("");
    setPattern("");
    setShowForm(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <Shield className="w-4 h-4" />
          Rules
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 rounded text-white"
        >
          <Plus className="w-3 h-3" />
          Add Rule
        </button>
      </div>

      {showForm && (
        <div className="p-3 border-b border-gray-700 bg-gray-800 flex flex-col gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Rule name"
            className="bg-gray-900 text-gray-100 px-3 py-1.5 rounded text-sm border border-gray-600 focus:border-indigo-500 focus:outline-none"
          />
          <input
            type="text"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="Glob pattern (e.g. **/*.ts)"
            className="bg-gray-900 text-gray-100 px-3 py-1.5 rounded text-sm font-mono border border-gray-600 focus:border-indigo-500 focus:outline-none"
          />
          <button
            onClick={handleAdd}
            disabled={!name.trim() || !pattern.trim()}
            className="self-end px-3 py-1 text-xs bg-green-600 hover:bg-green-500 disabled:opacity-40 rounded text-white"
          >
            Save
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto p-3">
        {rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600">
            <Shield className="w-12 h-12 mb-3 opacity-30" />
            <span className="text-sm">No rules defined yet</span>
            <span className="text-xs mt-1">Click "Add Rule" to create one</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {rules.map((rule) => (
              <div
                key={rule.id}
                onClick={() => toggleRule(rule.id)}
                className="group relative bg-gray-800/60 border border-gray-700/80 rounded-lg p-3 cursor-pointer hover:bg-gray-800 hover:border-gray-600 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {rule.enabled ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                    )}
                    <span className={`font-semibold text-sm truncate ${rule.enabled ? "text-gray-100" : "text-gray-500"}`}>
                      {rule.name}
                    </span>
                  </div>
                  <code className="text-[11px] font-mono text-gray-500 bg-gray-900/80 px-1.5 py-0.5 rounded flex-shrink-0 hidden sm:block">
                    {rule.pattern}
                  </code>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeRule(rule.id); }}
                    className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className={`text-xs mt-1.5 ml-6 ${rule.enabled ? "text-gray-400" : "text-gray-600"}`}>
                  Pattern: <code className="font-mono text-gray-500">{rule.pattern}</code>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
