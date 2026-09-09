import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe("File Handler", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("path-security integration", () => {
    it("validatePath should reject null bytes", async () => {
      const { validatePath } = await import("../../lib/path-security");
      expect(() => validatePath("/some/path\0/evil")).toThrow(
        "Access denied: path contains null bytes",
      );
    });

    it("validatePath should reject paths outside allowed roots", async () => {
      const { validatePath, setAllowedRoots } = await import("../../lib/path-security");
      setAllowedRoots(["/safe/dir"]);
      expect(() => validatePath("/etc/passwd")).toThrow(
        "Access denied",
      );
    });

    it("validatePath should accept paths within allowed roots", async () => {
      const { validatePath, setAllowedRoots } = await import("../../lib/path-security");
      setAllowedRoots(["/tmp"]);
      const result = validatePath("/tmp/test.txt");
      expect(result).toContain("/tmp");
    });

    it("isRpcPathAllowed should return false for null bytes", async () => {
      const { isRpcPathAllowed } = await import("../../lib/path-security");
      expect(isRpcPathAllowed("/some\0path")).toBe(false);
    });
  });

  describe("register", () => {
    it("should register all file.* methods", async () => {
      const registeredMethods: string[] = [];
      const mockServer = {
        register: vi.fn((method: string) => {
          registeredMethods.push(method);
        }),
      };

      vi.doMock("fs/promises", async (importOriginal) => {
        const actual = await importOriginal() as Record<string, unknown>;
        return {
          ...actual,
          readdir: vi.fn().mockResolvedValue([]),
          stat: vi.fn().mockResolvedValue({ isDirectory: () => true, size: 0 }),
          writeFile: vi.fn().mockResolvedValue(undefined),
          readFile: vi.fn().mockResolvedValue(Buffer.from("")),
          mkdir: vi.fn().mockResolvedValue(undefined),
          rename: vi.fn().mockResolvedValue(undefined),
          rm: vi.fn().mockResolvedValue(undefined),
          cp: vi.fn().mockResolvedValue(undefined),
        };
      });

      vi.doMock("fs", async (importOriginal) => {
        const actual = await importOriginal() as Record<string, unknown>;
        return {
          ...actual,
          existsSync: vi.fn().mockReturnValue(true),
        };
      });

      const { setAllowedRoots } = await import("../../lib/path-security");
      setAllowedRoots(["/tmp"]);

      const { register } = await import("../file");
      register(mockServer as any, { platform: "web" });

      const expectedMethods = [
        "file.findProjectRoot",
        "file.listDir",
        "file.createFile",
        "file.createDir",
        "file.rename",
        "file.delete",
        "file.copy",
        "file.readFile",
      ];

      for (const method of expectedMethods) {
        expect(registeredMethods).toContain(method);
      }
    });
  });
});
