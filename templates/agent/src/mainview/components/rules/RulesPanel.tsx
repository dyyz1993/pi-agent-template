import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Shield, CheckCircle2, Circle } from "lucide-react";
import { useRulesStore } from "../../stores/use-rules-store";

export function RulesPanel() {
  const { t } = useTranslation();
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
      <div className="p-3 border-b border-[var(--color-border-primary)] flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
          <Shield className="w-4 h-4" />
          {t("rules.title")}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded text-[var(--color-text-primary)]"
        >
          <Plus className="w-3 h-3" />
          {t("rules.add")}
        </button>
      </div>

      {showForm && (
        <div className="p-3 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] flex flex-col gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("rules.namePlaceholder")}
            className="bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)] px-3 py-1.5 rounded text-sm border border-[var(--color-border-secondary)] focus:border-[var(--color-accent)] focus:outline-none"
          />
          <input
            type="text"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder={t("rules.patternPlaceholder")}
            className="bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)] px-3 py-1.5 rounded text-sm font-mono border border-[var(--color-border-secondary)] focus:border-[var(--color-accent)] focus:outline-none"
          />
          <button
            onClick={handleAdd}
            disabled={!name.trim() || !pattern.trim()}
            className="self-end px-3 py-1 text-xs bg-green-600 hover:bg-green-500 disabled:opacity-40 rounded text-white"
          >
            {t("rules.save")}
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto p-3">
        {rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600">
            <Shield className="w-12 h-12 mb-3 opacity-30" />
            <span className="text-sm">{t("rules.empty")}</span>
            <span className="text-xs mt-1">{t("rules.emptyHint")}</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {rules.map((rule) => (
              <div
                key={rule.id}
                onClick={() => toggleRule(rule.id)}
                className="group relative bg-[var(--color-bg-secondary)]/60 border border-[var(--color-border-primary)]/80 rounded-lg p-3 cursor-pointer hover:bg-[var(--color-bg-secondary)] hover:border-[var(--color-border-secondary)] transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {rule.enabled ? (
                      <CheckCircle2 className="w-4 h-4 text-[var(--color-text-success)] flex-shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-4 h-4 text-[var(--color-text-placeholder)] flex-shrink-0 mt-0.5" />
                    )}
                    <span className={`font-semibold text-sm truncate ${rule.enabled ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text-placeholder)]"}`}>
                      {rule.name}
                    </span>
                  </div>
                  <code className="text-[11px] font-mono text-[var(--color-text-placeholder)] bg-[var(--color-bg-primary)]/80 px-1.5 py-0.5 rounded flex-shrink-0 hidden sm:block">
                    {rule.pattern}
                  </code>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeRule(rule.id); }}
                    className="text-gray-600 hover:text-[var(--color-text-error)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className={`text-xs mt-1.5 ml-6 ${rule.enabled ? "text-[var(--color-text-tertiary)]" : "text-gray-600"}`}>
                  {t("rules.pattern")} <code className="font-mono text-[var(--color-text-placeholder)]">{rule.pattern}</code>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
