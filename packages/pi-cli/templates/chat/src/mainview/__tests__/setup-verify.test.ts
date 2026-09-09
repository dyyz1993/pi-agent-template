import { describe, it, expect } from "vitest";

describe("vitest setup", () => {
  it("runs in happy-dom environment", () => {
    expect(typeof window).toBe("object");
    expect(typeof document).toBe("object");
  });
});
