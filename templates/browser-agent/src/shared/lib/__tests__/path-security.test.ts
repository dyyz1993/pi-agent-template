import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { validatePath, isRpcPathAllowed, setAllowedRoots } from "../path-security";

describe("path-security", () => {
  const originalCwd = process.cwd();
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    setAllowedRoots([process.cwd()]);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe("isRpcPathAllowed", () => {
    it("should allow paths within project root", () => {
      expect(isRpcPathAllowed(`${originalCwd}/src/main.ts`)).toBe(true);
    });

    it("should allow project root itself", () => {
      expect(isRpcPathAllowed(originalCwd)).toBe(true);
    });

    it("should reject paths outside project root", () => {
      expect(isRpcPathAllowed("/etc/passwd")).toBe(false);
      expect(isRpcPathAllowed("/etc/shadow")).toBe(false);
    });

    it("should reject path traversal attempts", () => {
      expect(isRpcPathAllowed(`${originalCwd}/../../../etc/passwd`)).toBe(false);
    });

    it("should reject paths with encoded traversal", () => {
      expect(isRpcPathAllowed(`${originalCwd}/%2e%2e/etc/passwd`)).toBe(false);
    });

    it("should handle relative paths", () => {
      expect(isRpcPathAllowed("./src/main.ts")).toBe(true);
      expect(isRpcPathAllowed("../../etc/passwd")).toBe(false);
    });

    it("should handle null bytes", () => {
      expect(isRpcPathAllowed(`${originalCwd}/file.txt\0/etc/passwd`)).toBe(false);
    });

    it("should work with multiple allowed roots", () => {
      setAllowedRoots([originalCwd, "/tmp/test"]);
      expect(isRpcPathAllowed("/tmp/test/file.txt")).toBe(true);
      expect(isRpcPathAllowed("/tmp/other/file.txt")).toBe(false);
    });
  });

  describe("validatePath", () => {
    it("should return resolved path for allowed paths", () => {
      const result = validatePath("./src/main.ts");
      expect(result).toContain("src/main.ts");
    });

    it("should throw for paths outside allowed roots", () => {
      expect(() => validatePath("/etc/passwd")).toThrow("Access denied");
    });

    it("should throw for path traversal attempts", () => {
      expect(() => validatePath("../../../etc/passwd")).toThrow("Access denied");
    });

    it("should throw for null byte injection", () => {
      expect(() => validatePath("file.txt\0/evil")).toThrow("Access denied");
    });

    it("should normalize the returned path", () => {
      const result = validatePath("./src/../src/./main.ts");
      expect(result).toBe(`${originalCwd}/src/main.ts`);
    });
  });
});
