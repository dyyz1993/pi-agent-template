import type { RPCServer } from "@chat-agent/rpc-core";
import type { MethodParams, MethodResult } from "@chat-agent/rpc-core";
import type { RPCMethods } from "../rpc-schema";
import { readdir, stat } from "fs/promises";
import { join } from "path";

type RegisterFn = <K extends keyof RPCMethods & string>(
  method: K,
  handler: (params: MethodParams<RPCMethods, K>) => Promise<MethodResult<RPCMethods, K>>,
) => void;

export function registerFileHandlers(server: RPCServer): void {
  const register: RegisterFn = (method, handler) => {
    server.register(method, handler as (params: unknown) => Promise<unknown>);
  };

  register("file.listDir", async (params) => {
    const basePath = params.path || process.cwd();
    const entries: { name: string; path: string; type: "file" | "directory"; size?: number }[] = [];
    try {
      const files = await readdir(basePath);
      for (const name of files) {
        const fullPath = join(basePath, name);
        try {
          const s = await stat(fullPath);
          entries.push({
            name,
            path: fullPath,
            type: s.isDirectory() ? "directory" : "file",
            size: s.size,
          });
        } catch {
          entries.push({ name, path: fullPath, type: "file" });
        }
      }
    } catch (err) {
      console.error("listDir error:", err);
    }
    return { entries, basePath };
  });
}
