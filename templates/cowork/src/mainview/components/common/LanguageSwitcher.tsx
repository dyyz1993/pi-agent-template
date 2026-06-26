import { useLocaleStore } from "../../stores/use-locale-store";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocaleStore();
  return (
    <button
      data-testid="language-switcher"
      onClick={() => setLocale(locale === "en" ? "zh" : "en")}
      className="px-1.5 py-0.5 rounded text-xs hover:bg-[var(--color-bg-hover)] transition-colors text-[var(--color-text-secondary)]"
      title={locale === "en" ? "切换到中文" : "Switch to English"}
    >
      {locale === "en" ? "中" : "EN"}
    </button>
  );
}
