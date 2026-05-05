import { useTranslation } from "react-i18next";
import { items } from "./ActivityBar";

export function MobileTabBar() {
  const { t } = useTranslation();

  return (
    <div className="h-14 bg-gray-900 border-t border-gray-700 flex items-center justify-around flex-shrink-0">
      {items.map(({ id, icon: Icon, labelKey }) => (
        <button
          key={id}
          className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded transition-colors text-indigo-400"
        >
          <Icon className="w-5 h-5" />
          <span className="text-[10px]">{t(labelKey)}</span>
        </button>
      ))}
    </div>
  );
}
