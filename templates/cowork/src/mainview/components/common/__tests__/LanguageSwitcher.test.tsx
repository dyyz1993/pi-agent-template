import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

const mockSetLocale = vi.fn();

vi.mock("../../stores/use-locale-store", () => ({
  useLocaleStore: (selector: (s: any) => any) =>
    selector({ locale: "en", setLocale: mockSetLocale }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("LanguageSwitcher", () => {
  afterEach(cleanup);

  it("should render a button", async () => {
    const { LanguageSwitcher } = await import("../LanguageSwitcher");
    render(<LanguageSwitcher />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("should show '中' when locale is en", async () => {
    const { LanguageSwitcher } = await import("../LanguageSwitcher");
    render(<LanguageSwitcher />);
    expect(screen.getByText("中")).toBeInTheDocument();
  });

  it("should have title 切换到中文 for en locale", async () => {
    const { LanguageSwitcher } = await import("../LanguageSwitcher");
    render(<LanguageSwitcher />);
    expect(screen.getByRole("button")).toHaveAttribute("title", "切换到中文");
  });

  it("should display locale-specific text content", async () => {
    const { LanguageSwitcher } = await import("../LanguageSwitcher");
    render(<LanguageSwitcher />);
    const button = screen.getByRole("button");
    expect(button.textContent).toBe("中");
    expect(button.className).toContain("rounded");
  });
});
