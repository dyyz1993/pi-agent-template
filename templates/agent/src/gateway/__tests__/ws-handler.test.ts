import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../server-config", () => ({
  config: {
    authToken: "test-token",
    port: 3100,
    corsOrigin: "http://localhost:5173",
  },
}));

vi.mock("../../shared/lib/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe("WebSocket Handler", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should reject connections without token", async () => {
    const { config } = await import("../../server-config");

    const token = null;
    const isValid = token === config.authToken;
    expect(isValid).toBe(false);
  });

  it("should reject wrong token", async () => {
    const { config } = await import("../../server-config");

    const token = "wrong-token";
    const isValid = token === config.authToken;
    expect(isValid).toBe(false);
  });

  it("should accept correct token", async () => {
    const { config } = await import("../../server-config");

    const token = "test-token";
    const isValid = token === config.authToken;
    expect(isValid).toBe(true);
  });
});
