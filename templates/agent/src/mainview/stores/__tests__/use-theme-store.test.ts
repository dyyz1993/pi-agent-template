import { describe, it, expect, beforeEach, vi } from "vitest";

describe("useThemeStore", () => {
  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("should default to dark theme", async () => {
    const { useThemeStore } = await import("../use-theme-store");
    const state = useThemeStore.getState();
    expect(state.theme).toBe("dark");
  });

  it("should toggle between light and dark", async () => {
    const { useThemeStore } = await import("../use-theme-store");
    const store = useThemeStore.getState();

    expect(store.theme).toBe("dark");
    store.toggleTheme();
    expect(useThemeStore.getState().theme).toBe("light");

    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe("dark");
  });

  it("should set theme explicitly", async () => {
    const { useThemeStore } = await import("../use-theme-store");
    useThemeStore.getState().setTheme("light");
    expect(useThemeStore.getState().theme).toBe("light");
  });

  it("should persist theme to localStorage", async () => {
    const { useThemeStore } = await import("../use-theme-store");
    useThemeStore.getState().setTheme("light");

    expect(localStorage.getItem("theme")).toBe("light");
  });

  it("should restore theme from localStorage", async () => {
    localStorage.setItem("theme", "light");

    vi.resetModules();
    const { useThemeStore } = await import("../use-theme-store");

    expect(useThemeStore.getState().theme).toBe("light");
  });

  it("should apply dark class to document element", async () => {
    const { useThemeStore } = await import("../use-theme-store");
    useThemeStore.getState().setTheme("dark");

    expect(document.documentElement.classList.contains("dark")).toBe(true);

    useThemeStore.getState().setTheme("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
