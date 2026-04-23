import type { RPCServer } from "@chat-agent/rpc-core";
import type { MethodParams, MethodResult } from "@chat-agent/rpc-core";
import type { RPCMethods, HandlerOptions } from "../rpc-schema";
import type { GitFileChange } from "../modules/git";

type RegisterFn = <K extends keyof RPCMethods & string>(
  method: K,
  handler: (params: MethodParams<RPCMethods, K>) => Promise<MethodResult<RPCMethods, K>>,
) => void;

function execGit(args: string[], cwd: string, allowNonZero = false): string {
  const proc = Bun.spawnSync(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe" });
  if (proc.exitCode !== 0 && !allowNonZero) {
    throw new Error(proc.stderr.toString().trim() || `git ${args[0]} failed`);
  }
  return proc.stdout.toString();
}

function getRepoRoot(cwd: string): string {
  return execGit(["rev-parse", "--show-toplevel"], cwd).trim();
}

function parseStatus(output: string): {
  staged: GitFileChange[];
  changed: GitFileChange[];
  untracked: string[];
} {
  const staged: GitFileChange[] = [];
  const changed: GitFileChange[] = [];
  const untracked: string[] = [];

  for (const line of output.split("\n")) {
    if (!line.trim()) continue;
    const xy = line.slice(0, 2);
    const filePath = line.slice(3).trim();

    const statusMap: Record<string, "modified" | "added" | "deleted" | "renamed" | "copied"> = {
      M: "modified", A: "added", D: "deleted", R: "renamed", C: "copied",
    };

    // Index (staged) - first char
    const indexStatus = xy[0];
    if (indexStatus !== " " && indexStatus !== "?" && statusMap[indexStatus]) {
      const path = indexStatus === "R" ? filePath.split(" -> ")[1] : filePath;
      staged.push({ path, status: statusMap[indexStatus] });
    }

    // Working tree - second char
    const wtStatus = xy[1];
    if (wtStatus !== " " && wtStatus !== "?" && statusMap[wtStatus]) {
      changed.push({ path: filePath, status: statusMap[wtStatus] });
    }

    // Untracked
    if (xy === "??") {
      untracked.push(filePath);
    }
  }

  return { staged, changed, untracked };
}

export function register(server: RPCServer, _options: HandlerOptions): void {
  const r: RegisterFn = (method, handler) => {
    server.register(method, handler as (params: unknown) => Promise<unknown>);
  };

  r("git.status", async (params) => {
    const repoRoot = getRepoRoot(params.repoPath);
    const output = execGit(["status", "--porcelain=v1", "--branch"], repoRoot);
    const lines = output.split("\n");

    // Parse branch info from first line
    const branchLine = lines[0] || "";
    const branchMatch = branchLine.match(/^## (.+?)(?:\.\.\.(\S+))?(?:\s+\[(ahead\s+(\d+))?(?:,\s*)?(behind\s+(\d+))?\])?$/);
    const branch = branchMatch?.[1]?.replace("HEAD detached", "").replace(/[()]/g, "").trim() || "unknown";
    const ahead = branchMatch?.[3] ? parseInt(branchMatch[3]) : 0;
    const behind = branchMatch?.[5] ? parseInt(branchMatch[5]) : 0;

    const { staged, changed, untracked } = parseStatus(lines.slice(1).join("\n"));

    return { staged, changed, untracked, branch, ahead, behind };
  });

  r("git.diff", async (params) => {
    const repoRoot = getRepoRoot(params.repoPath);
    let diff = "";
    if (params.staged) {
      diff = execGit(["diff", "--cached", "--", params.filePath], repoRoot);
    } else {
      diff = execGit(["diff", "--", params.filePath], repoRoot);
      if (!diff) {
        try {
          diff = execGit(["diff", "--no-index", "/dev/null", params.filePath], repoRoot, true);
        } catch {
          // ignore
        }
      }
    }

    // Get old content (HEAD version) and new content (working tree)
    let oldContent = "";
    let newContent = "";
    try {
      oldContent = execGit(["show", `HEAD:${params.filePath}`], repoRoot);
    } catch {
      // New file — no old content
    }
    try {
      const { readFile } = await import("fs/promises");
      const { join } = await import("path");
      newContent = (await readFile(join(repoRoot, params.filePath))).toString();
    } catch {
      // Deleted file — no new content
    }

    return { filePath: params.filePath, diff, oldContent, newContent };
  });

  r("git.log", async (params) => {
    const repoRoot = getRepoRoot(params.repoPath);
    const count = params.maxCount || 50;
    const output = execGit([
      "log", `--max-count=${count}`,
      "--pretty=format:%H|%h|%s|%an|%aI",
    ], repoRoot);

    const commits = output.split("\n").filter(Boolean).map((line) => {
      const [hash, shortHash, message, author, date] = line.split("|");
      return { hash, shortHash, message, author, date };
    });

    return { commits };
  });
}
