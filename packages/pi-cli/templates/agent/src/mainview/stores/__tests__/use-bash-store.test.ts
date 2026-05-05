import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/api-client", () => ({
  apiClient: { call: vi.fn() },
}));

vi.mock("../use-log-store", () => ({
  useLogStore: { getState: () => ({ addLog: vi.fn() }) },
}));

describe("useBashStore", () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  it("should have correct initial state", async () => {
    const { useBashStore } = await import("../use-bash-store");
    const state = useBashStore.getState();
    expect(state.processes.size).toBe(0);
    expect(state.activePid).toBeNull();
  });

  it("should add a process", async () => {
    const { useBashStore } = await import("../use-bash-store");
    useBashStore.getState().addProcess(1234, "ls -la");
    const state = useBashStore.getState();
    expect(state.processes.has(1234)).toBe(true);
    expect(state.processes.get(1234)!.command).toBe("ls -la");
    expect(state.processes.get(1234)!.running).toBe(true);
    expect(state.processes.get(1234)!.output).toBe("");
    expect(state.activePid).toBe(1234);
  });

  it("should update output", async () => {
    const { useBashStore } = await import("../use-bash-store");
    useBashStore.getState().addProcess(1234, "echo hello");
    useBashStore.getState().updateOutput(1234, "hello\n");
    expect(useBashStore.getState().processes.get(1234)!.output).toBe("hello\n");
  });

  it("should remove (stop) a process", async () => {
    const { useBashStore } = await import("../use-bash-store");
    useBashStore.getState().addProcess(1234, "ls");
    useBashStore.getState().removeProcess(1234);
    expect(useBashStore.getState().processes.get(1234)!.running).toBe(false);
  });

  it("should set active pid", async () => {
    const { useBashStore } = await import("../use-bash-store");
    useBashStore.getState().setActive(999);
    expect(useBashStore.getState().activePid).toBe(999);
    useBashStore.getState().setActive(null);
    expect(useBashStore.getState().activePid).toBeNull();
  });

  it("should execute command via apiClient", async () => {
    const { apiClient } = await import("../../lib/api-client");
    const { useBashStore } = await import("../use-bash-store");
    (apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      pid: 5678,
      output: "hello world\n",
    });

    await useBashStore.getState().executeCommand("echo hello world", "/home");
    expect(apiClient.call).toHaveBeenCalledWith("bash.execute", { command: "echo hello world", cwd: "/home" });
    const state = useBashStore.getState();
    expect(state.processes.has(5678)).toBe(true);
    expect(state.processes.get(5678)!.output).toBe("hello world\n");
  });

  it("should kill process via apiClient", async () => {
    const { apiClient } = await import("../../lib/api-client");
    const { useBashStore } = await import("../use-bash-store");
    useBashStore.getState().addProcess(1234, "sleep 100");
    (apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

    await useBashStore.getState().killProcess(1234);
    expect(apiClient.call).toHaveBeenCalledWith("bash.kill", { pid: 1234 });
    expect(useBashStore.getState().processes.get(1234)!.running).toBe(false);
  });

  it("should fetch processes", async () => {
    const { apiClient } = await import("../../lib/api-client");
    const { useBashStore } = await import("../use-bash-store");
    (apiClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      processes: [
        { pid: 100, command: "ls", running: true },
        { pid: 200, command: "pwd", running: false },
      ],
    });

    await useBashStore.getState().fetchProcesses();
    const state = useBashStore.getState();
    expect(state.processes.size).toBe(2);
    expect(state.processes.get(100)!.command).toBe("ls");
    expect(state.processes.get(100)!.running).toBe(true);
    expect(state.processes.get(200)!.running).toBe(false);
  });
});
