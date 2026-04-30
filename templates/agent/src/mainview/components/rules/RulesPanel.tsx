import { useState, useEffect } from "react";
import { Plus, Trash2, Shield } from "lucide-react";
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

      <div className="flex-1 overflow-auto">
        {rules.length === 0 ? (
          <div className="p-4 text-gray-600 text-sm text-center">No rules defined yet.</div>
        ) : (
          <div className="divide-y divide-gray-700">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-800/50">
                <button
                  onClick={() => toggleRule(rule.id)}
                  className={`w-8 h-4 rounded-full transition-colors relative flex-shrink-0 ${
                    rule.enabled ? "bg-indigo-600" : "bg-gray-600"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                      rule.enabled ? "left-4.5 translate-x-0" : "left-0.5"
                    }`}
                    style={{ left: rule.enabled ? "17px" : "2px" }}
                  />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-200 truncate">{rule.name}</div>
                  <div className="text-xs text-gray-500 font-mono truncate">{rule.pattern}</div>
                </div>
                <button
                  onClick={() => removeRule(rule.id)}
                  className="text-gray-600 hover:text-red-400 flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
