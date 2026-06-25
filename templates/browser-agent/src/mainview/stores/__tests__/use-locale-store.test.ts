import { describe, it, expect, beforeEach, vi } from "vitest";

describe("useLocaleStore", () => {
  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();
  });

  it("should default to English", async () => {
    const { useLocaleStore } = await import("../use-locale-store");
    expect(useLocaleStore.getState().locale).toBe("en");
  });

  it("should change locale", async () => {
    const { useLocaleStore } = await import("../use-locale-store");
    useLocaleStore.getState().setLocale("zh");
    expect(useLocaleStore.getState().locale).toBe("zh");
  });

  it("should persist locale to localStorage", async () => {
    const { useLocaleStore } = await import("../use-locale-store");
    useLocaleStore.getState().setLocale("zh");
    expect(localStorage.getItem("locale")).toBe("zh");
  });

  it("should restore locale from localStorage", async () => {
    localStorage.setItem("locale", "zh");
    vi.resetModules();
    const { useLocaleStore } = await import("../use-locale-store");
    expect(useLocaleStore.getState().locale).toBe("zh");
  });
});
