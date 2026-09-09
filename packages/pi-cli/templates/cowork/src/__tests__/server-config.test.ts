import { describe, it, expect } from "vitest";
import { parseEnvInt } from "../server-config";

describe("parseEnvInt", () => {
  it("should return default when value is undefined", () => {
    expect(parseEnvInt("TEST_KEY", undefined, 3100, 1024, 65535)).toBe(3100);
  });

  it("should return default when value is empty string", () => {
    expect(parseEnvInt("TEST_KEY", "", 3100, 1024, 65535)).toBe(3100);
  });

  it("should parse valid number", () => {
    expect(parseEnvInt("TEST_KEY", "8080", 3100, 1024, 65535)).toBe(8080);
  });

  it("should return default for NaN input", () => {
    expect(parseEnvInt("TEST_KEY", "abc", 3100, 1024, 65535)).toBe(3100);
  });

  it("should return default for out-of-range value (too low)", () => {
    expect(parseEnvInt("TEST_KEY", "80", 3100, 1024, 65535)).toBe(3100);
  });

  it("should return default for out-of-range value (too high)", () => {
    expect(parseEnvInt("TEST_KEY", "99999", 3100, 1024, 65535)).toBe(3100);
  });

  it("should accept boundary min value", () => {
    expect(parseEnvInt("TEST_KEY", "1024", 3100, 1024, 65535)).toBe(1024);
  });

  it("should accept boundary max value", () => {
    expect(parseEnvInt("TEST_KEY", "65535", 3100, 1024, 65535)).toBe(65535);
  });
});

describe("server-config exports", () => {
  it("should export config with all required fields", async () => {
    const { config } = await import("../server-config");
    expect(config).toHaveProperty("port");
    expect(config).toHaveProperty("authToken");
    expect(config).toHaveProperty("maxUploadSize");
    expect(config).toHaveProperty("logDir");
    expect(config).toHaveProperty("corsOrigin");
    expect(typeof config.port).toBe("number");
    expect(typeof config.authToken).toBe("string");
    expect(typeof config.maxUploadSize).toBe("number");
    expect(typeof config.corsOrigin).toBe("string");
  });

  it("should have sensible defaults", async () => {
    const { config } = await import("../server-config");
    expect(config.port).toBeGreaterThanOrEqual(1024);
    expect(config.port).toBeLessThanOrEqual(65535);
    expect(config.maxUploadSize).toBeGreaterThan(0);
    expect(config.corsOrigin).toBeTruthy();
  });
});
