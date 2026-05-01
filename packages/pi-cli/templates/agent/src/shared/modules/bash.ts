export interface BashMethods {
  "bash.execute": {
    params: { command: string; cwd?: string };
    result: { pid: number; output: string };
  };
  "bash.kill": {
    params: { pid: number };
    result: { success: boolean };
  };
  "bash.listProcesses": {
    params: {};
    result: { processes: Array<{ pid: number; command: string; running: boolean }> };
  };
}

export interface BashEvents {
  "bash.output": { pid: number; data: string; stream: "stdout" | "stderr" };
  "bash.exit": { pid: number; code: number | null };
}
