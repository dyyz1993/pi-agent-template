import type { RPCServer } from "@dyyz1993/rpc-core";
import type { MethodParams, MethodResult } from "@dyyz1993/rpc-core";
import type { RPCMethods, HandlerOptions } from "../rpc-schema";
import { validateCommand, setCommandPolicy } from "../lib/bash-security";

type RegisterFn = <K extends keyof RPCMethods & string>(
  method: K,
  handler: (params: MethodParams<RPCMethods, K>) => Promise<MethodResult<RPCMethods, K>>,
) => void;

interface TrackedProcess {
  pid: number;
  command: string;
  running: boolean;
}

const processes = new Map<number, TrackedProcess>();
let pidCounter = 1;

export function register(server: RPCServer, _options: HandlerOptions): void {
  setCommandPolicy({
    enabled: _options.enableBash !== false,
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

  const r: RegisterFn = (method, handler) => {
    server.register(method, handler as (params: unknown) => Promise<unknown>);
  };

  r("bash.execute", async (params) => {
    const safeCommand = validateCommand(params.command);
    const pid = pidCounter++;
    const proc: TrackedProcess = { pid, command: safeCommand, running: true };
    processes.set(pid, proc);

    try {
      const subprocess = Bun.spawn(safeCommand.split(" "), {
        cwd: params.cwd || process.cwd(),
        stdout: "pipe",
        stderr: "pipe",
      });

      proc.pid = subprocess.pid;

      const stdout = await new Response(subprocess.stdout).text();
      const stderr = await new Response(subprocess.stderr).text();
      const exitCode = await subprocess.exited;

      proc.running = false;

      const output = stdout + (stderr ? `\n[stderr]\n${stderr}` : "");

      server.emitEvent("bash.output", { pid, data: output, stream: "stdout" }, {});
      server.emitEvent("bash.exit", { pid, code: exitCode }, {});

      return { pid, output };
    } catch (err) {
      proc.running = false;
      const output = `Error: ${err instanceof Error ? err.message : String(err)}`;
      server.emitEvent("bash.output", { pid, data: output, stream: "stderr" }, {});
      server.emitEvent("bash.exit", { pid, code: 1 }, {});
      return { pid, output };
    }
  });

  r("bash.kill", async (params) => {
    const proc = processes.get(params.pid);
    if (proc) {
      proc.running = false;
      processes.delete(params.pid);
      return { success: true };
    }
    return { success: false };
  });

  r("bash.listProcesses", async () => ({
    processes: Array.from(processes.values()),
  }));
}
