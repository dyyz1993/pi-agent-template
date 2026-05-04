import { describe, it, expect, beforeEach } from "vitest";
import {
  isCommandAllowed,
  validateCommand,
  setCommandPolicy,
} from "../bash-security";

describe("bash-security", () => {
  describe("default policy (enabled with blocked list)", () => {
    beforeEach(() => {
      setCommandPolicy({
        enabled: true,
        blockedPatterns: [
          /rm\s+-rf\s+(.*\s)?\/($|\s)/,
          /rm\s+-rf\s+--no-preserve-root/,
          /mkfs/,
          /dd\s+if=/,
          />\s*\/dev\//,
          /:()\s*\{.*\|.*&\s*\}/,
          /shutdown/,
          /reboot/,
        ],
        allowedCommands: null,
      });
    });

    it("should allow normal commands", () => {
      expect(isCommandAllowed("ls -la")).toBe(true);
      expect(isCommandAllowed("git status")).toBe(true);
      expect(isCommandAllowed("npm install")).toBe(true);
      expect(isCommandAllowed("echo hello")).toBe(true);
    });

    it("should block dangerous rm -rf /", () => {
      expect(isCommandAllowed("rm -rf /")).toBe(false);
      expect(isCommandAllowed("rm -rf --no-preserve-root /")).toBe(false);
    });

    it("should block mkfs commands", () => {
      expect(isCommandAllowed("mkfs.ext4 /dev/sda1")).toBe(false);
    });

    it("should block dd write commands", () => {
      expect(isCommandAllowed("dd if=/dev/zero of=/dev/sda")).toBe(false);
    });

    it("should block redirect to device files", () => {
      expect(isCommandAllowed("echo data > /dev/sda")).toBe(false);
    });

    it("should block shutdown and reboot", () => {
      expect(isCommandAllowed("shutdown now")).toBe(false);
      expect(isCommandAllowed("reboot")).toBe(false);
    });

    it("should allow rm in project directory", () => {
      expect(isCommandAllowed("rm -rf ./node_modules")).toBe(true);
      expect(isCommandAllowed("rm -rf ./dist")).toBe(true);
    });
  });

  describe("disabled policy", () => {
    it("should reject all commands when disabled", () => {
      setCommandPolicy({
        enabled: false,
        blockedPatterns: [],
        allowedCommands: null,
      });
      expect(isCommandAllowed("ls")).toBe(false);
      expect(isCommandAllowed("echo hello")).toBe(false);
    });
  });

  describe("whitelist policy", () => {
    it("should only allow whitelisted commands", () => {
      setCommandPolicy({
        enabled: true,
        blockedPatterns: [],
        allowedCommands: ["git", "npm", "node", "ls", "cat", "echo"],
      });
      expect(isCommandAllowed("git status")).toBe(true);
      expect(isCommandAllowed("npm test")).toBe(true);
      expect(isCommandAllowed("python script.py")).toBe(false);
    });
  });

  describe("validateCommand", () => {
    it("should return trimmed command for allowed commands", () => {
      setCommandPolicy({
        enabled: true,
        blockedPatterns: [],
        allowedCommands: null,
      });
      expect(validateCommand("  ls -la  ")).toBe("ls -la");
    });

    it("should throw for blocked commands", () => {
      setCommandPolicy({
        enabled: true,
        blockedPatterns: [/rm\s+-rf\s+\//],
        allowedCommands: null,
      });
      expect(() => validateCommand("rm -rf /")).toThrow("blocked");
    });

    it("should throw when bash is disabled", () => {
      setCommandPolicy({
        enabled: false,
        blockedPatterns: [],
        allowedCommands: null,
      });
      expect(() => validateCommand("ls")).toThrow("disabled");
    });

    it("should throw for empty commands", () => {
      setCommandPolicy({
        enabled: true,
        blockedPatterns: [],
        allowedCommands: null,
      });
      expect(() => validateCommand("")).toThrow("empty");
      expect(() => validateCommand("   ")).toThrow("empty");
    });
  });
});
