import { describe, it, expect, beforeEach, vi } from "vitest";

describe("i18n configuration", () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  it("should export configured i18n instance", async () => {
    const i18n = await import("../../lib/i18n");
    expect(i18n.default).toBeDefined();
    expect(i18n.default.isInitialized).toBe(true);
  });

  it("should have English translations", async () => {
    const i18n = await import("../../lib/i18n");
    expect(
      i18n.default.getResource("en", "translation", "app.title")
    ).toBeDefined();
  });

  it("should have Chinese translations", async () => {
    const i18n = await import("../../lib/i18n");
    expect(
      i18n.default.getResource("zh", "translation", "app.title")
    ).toBeDefined();
  });

  it("should change language", async () => {
    const i18n = await import("../../lib/i18n");
    await i18n.default.changeLanguage("zh");
    expect(i18n.default.language).toBe("zh");

    await i18n.default.changeLanguage("en");
    expect(i18n.default.language).toBe("en");
  });

  it("should translate keys correctly in English", async () => {
    const i18n = await import("../../lib/i18n");
    await i18n.default.changeLanguage("en");
    expect(i18n.default.t("app.title")).toBe("Pi Chat");
  });

  it("should translate keys correctly in Chinese", async () => {
    const i18n = await import("../../lib/i18n");
    await i18n.default.changeLanguage("zh");
    expect(i18n.default.t("app.title")).toBe("Pi Chat");
  });
});
