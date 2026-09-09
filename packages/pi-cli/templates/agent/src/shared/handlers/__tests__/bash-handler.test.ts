import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RPCServer } from "@dyyz1993/rpc-core";

vi.stubGlobal("Bun", {
  spawn: vi.fn(),
});

vi.mock("../../lib/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe("Bash Handler", () => {
  let registeredHandlers: Record<string, Function>;
  let mockServer: {
    register: ReturnType<typeof vi.fn>;
    emitEvent: ReturnType<typeof vi.fn>;
  };

  function createMockSubprocess(overrides: { stdout?: string; stderr?: string; exitCode?: number; pid?: number } = {}) {
    return {
      pid: overrides.pid ?? 1234,
      stdout: { text: () => Promise.resolve(overrides.stdout ?? "") },
      stderr: { text: () => Promise.resolve(overrides.stderr ?? "") },
      exited: Promise.resolve(overrides.exitCode ?? 0),
    };
  }

  beforeEach(async () => {
    vi.resetModules();
    registeredHandlers = {};
    mockServer = {
      register: vi.fn((method: string, handler: Function) => {
        registeredHandlers[method] = handler;
      }),
      emitEvent: vi.fn(),
    };

    (Bun.spawn as ReturnType<typeof vi.fn>).mockReturnValue(createMockSubprocess());

    vi.stubGlobal("Response", class {
      private src: any;
      constructor(src: any) { this.src = src; }
      async text() {
        if (this.src && typeof this.src.text === "function") return this.src.text();
        return String(this.src);
      }
    });

    const { register } = await import("../bash");
    register(mockServer as unknown as RPCServer, { platform: "web" });
  });

  it("should register bash.execute, bash.kill, bash.listProcesses", () => {
    expect(registeredHandlers["bash.execute"]).toBeDefined();
    expect(registeredHandlers["bash.kill"]).toBeDefined();
    expect(registeredHandlers["bash.listProcesses"]).toBeDefined();
  });

  it("bash.execute should run command and return output", async () => {
    (Bun.spawn as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockSubprocess({ stdout: "hello output" }),
    );

    const result = await registeredHandlers["bash.execute"]({ command: "echo hello" });
    expect(result).toHaveProperty("pid");
    expect(result.output).toContain("hello output");
    expect(Bun.spawn).toHaveBeenCalledWith(
      ["echo", "hello"],
      expect.objectContaining({ stdout: "pipe", stderr: "pipe" }),
    );
  });

  it("bash.execute should include stderr in output", async () => {
    (Bun.spawn as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockSubprocess({ stdout: "", stderr: "error msg", exitCode: 1 }),
    );

    const result = await registeredHandlers["bash.execute"]({ command: "ls /nonexistent" });
    expect(result.output).toContain("error msg");
    expect(result.output).toContain("[stderr]");
    expect(mockServer.emitEvent).toHaveBeenCalledWith(
      "bash.exit",
      expect.objectContaining({ code: 1 }),
      {},
    );
  });

  it("bash.execute should handle spawn failure gracefully", async () => {
    (Bun.spawn as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("spawn failed");
    });

    const result = await registeredHandlers["bash.execute"]({ command: "bad-command" });
    expect(result.output).toContain("Error: spawn failed");
    expect(mockServer.emitEvent).toHaveBeenCalledWith(
      "bash.exit",
      expect.objectContaining({ code: 1 }),
      {},
    );
  });

  it("bash.listProcesses should return tracked processes", async () => {
    (Bun.spawn as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockSubprocess({ stdout: "test" }),
    );

    await registeredHandlers["bash.execute"]({ command: "echo test" });
    const result = await registeredHandlers["bash.listProcesses"]();
    expect(result.processes).toBeInstanceOf(Array);
    expect(result.processes.length).toBeGreaterThanOrEqual(1);
    expect(result.processes[0]).toHaveProperty("command");
    expect(result.processes[0]).toHaveProperty("pid");
  });

  it("bash.kill should succeed for tracked process using returned pid", async () => {
    (Bun.spawn as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockSubprocess({ stdout: "ok", pid: 9999 }),
    );

    const execResult = await registeredHandlers["bash.execute"]({ command: "echo hi" });

    const killResult = await registeredHandlers["bash.kill"]({ pid: execResult.pid });
    expect(killResult).toEqual({ success: true });
  });

  it("bash.kill should fail for unknown pid", async () => {
    const result = await registeredHandlers["bash.kill"]({ pid: 99999 });
    expect(result).toEqual({ success: false });
  });
});
