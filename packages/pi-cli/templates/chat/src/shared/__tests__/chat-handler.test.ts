import { describe, it, expect } from "vitest";
import { generateReply } from "../handlers/chat";

describe("generateReply", () => {
  it("should respond to greetings", () => {
    const reply = generateReply("hello");
    expect(reply).toMatch(/hey|hello|hi/i);
  });

  it("should respond to hi", () => {
    const reply = generateReply("hi there");
    expect(reply).toBeTruthy();
  });

  it("should respond to time queries", () => {
    const reply = generateReply("what time is it?");
    expect(reply).toContain("**");
  });

  it("should respond to date queries", () => {
    const reply = generateReply("what is the date today?");
    expect(reply).toContain("**");
  });

  it("should calculate simple math", () => {
    const reply = generateReply("12 * 8");
    expect(reply).toContain("96");
  });

  it("should calculate addition", () => {
    const reply = generateReply("10 + 5");
    expect(reply).toContain("15");
  });

  it("should calculate subtraction", () => {
    const reply = generateReply("100 - 30");
    expect(reply).toContain("70");
  });

  it("should handle division by zero", () => {
    const reply = generateReply("10 / 0");
    expect(reply).toMatch(/zero|couldn/i);
  });

  it("should respond to file-related queries", () => {
    const reply = generateReply("show me files");
    expect(reply).toMatch(/file|explorer/i);
  });

  it("should respond to git queries", () => {
    const reply = generateReply("git status");
    expect(reply).toMatch(/git/i);
  });

  it("should respond to help", () => {
    const reply = generateReply("help");
    expect(reply).toMatch(/time|math|help/i);
  });

  it("should return a default reply for unknown input", () => {
    const reply = generateReply("xyzzy random unknown thing");
    expect(reply).toBeTruthy();
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(0);
  });

  it("should respond to math with natural language", () => {
    const reply = generateReply("what is 100 / 4");
    expect(reply).toContain("25");
  });
});
