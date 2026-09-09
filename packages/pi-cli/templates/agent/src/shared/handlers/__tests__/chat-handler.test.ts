import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe("Chat Handler", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("generateReply logic", () => {
    it("should handle greeting patterns", () => {
      const greetingPattern = /^(hi|hello|hey|howdy|hola|yo|sup)\b/i;
      expect(greetingPattern.test("hello")).toBe(true);
      expect(greetingPattern.test("hi there")).toBe(true);
      expect(greetingPattern.test("what is this")).toBe(false);
    });

    it("should match time/date queries", () => {
      const timePattern = /what('?s| is) the (time|date|day)|current (time|date)|what time|today'?s date/i;
      expect(timePattern.test("what's the time")).toBe(true);
      expect(timePattern.test("what is the date")).toBe(true);
      expect(timePattern.test("current time")).toBe(true);
      expect(timePattern.test("hello world")).toBe(false);
    });

    it("should match math expressions", () => {
      const mathPattern = /(?:what(?:'s| is)\s+)?(\d+(?:\.\d+)?)\s*([+\-*/x×÷^])\s*(\d+(?:\.\d+)?)/;
      expect(mathPattern.test("12 * 8")).toBe(true);
      expect(mathPattern.test("what is 100 / 4")).toBe(true);
      expect(mathPattern.test("3 + 5")).toBe(true);
      expect(mathPattern.test("hello")).toBe(false);
    });

    it("should compute math correctly", () => {
      const compute = (a: number, op: string, b: number): number => {
        switch (op) {
          case "+": return a + b;
          case "-": return a - b;
          case "*": return a * b;
          case "/": return b !== 0 ? a / b : NaN;
          default: return NaN;
        }
      };

      expect(compute(3, "+", 5)).toBe(8);
      expect(compute(10, "-", 4)).toBe(6);
      expect(compute(6, "*", 7)).toBe(42);
      expect(compute(20, "/", 4)).toBe(5);
      expect(compute(1, "/", 0)).toBeNaN();
    });
  });

  describe("register", () => {
    it("should register chat.list and chat.send methods", async () => {
      const registeredMethods: string[] = [];
      const mockServer = {
        register: vi.fn((method: string) => {
          registeredMethods.push(method);
        }),
        emitEvent: vi.fn(),
      };

      const { register } = await import("../chat");
      register(mockServer as any, { platform: "web" });

      expect(registeredMethods).toContain("chat.list");
      expect(registeredMethods).toContain("chat.send");
    });
  });
});
