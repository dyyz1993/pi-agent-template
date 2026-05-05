import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

vi.mock("../../../lib/i18n", () => ({
  default: {
    isInitialized: true,
    language: "en",
    changeLanguage: vi.fn(),
    t: (key: string) => key,
    getResource: vi.fn(),
  },
  supportedLocales: ["en", "zh"],
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

describe("ErrorBoundary", () => {
  it("should render children when no error", async () => {
    const { ErrorBoundary } = await import("../ErrorBoundary");
    render(
      <ErrorBoundary>
        <div>Normal content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("Normal content")).toBeDefined();
  });

  it("should render fallback UI when child throws", async () => {
    const { ErrorBoundary } = await import("../ErrorBoundary");

    const ThrowingComponent = () => {
      throw new Error("Test error");
    };

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeDefined();

    spy.mockRestore();
  });

  it("should show retry button in error state", async () => {
    const { ErrorBoundary } = await import("../ErrorBoundary");

    const ThrowingComponent = () => {
      throw new Error("Test error");
    };

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByRole("button", { name: /retry/i })).toBeDefined();

    spy.mockRestore();
  });
});
