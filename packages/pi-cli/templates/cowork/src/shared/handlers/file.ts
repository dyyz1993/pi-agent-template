import type { RPCServer } from "@dyyz1993/rpc-core";
import type { MethodParams, MethodResult } from "@dyyz1993/rpc-core";
import type { RPCMethods, HandlerOptions } from "../rpc-schema";
import { readdir, stat, writeFile, readFile, mkdir, rename, rm, cp } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { createLogger } from "../lib/logger";
import { validatePath } from "../lib/path-security";

const log = createLogger("file");

type RegisterFn = <K extends keyof RPCMethods & string>(
  method: K,
  handler: (params: MethodParams<RPCMethods, K>) => Promise<MethodResult<RPCMethods, K>>,
) => void;

export function register(server: RPCServer, _options: HandlerOptions): void {
  const r: RegisterFn = (method, handler) => {
    server.register(method, handler as (params: unknown) => Promise<unknown>);
  };

  r("file.findProjectRoot", async () => {
    let dir = process.cwd();
    for (let i = 0; i < 20; i++) {
      if (existsSync(join(dir, "package.json"))) return { path: dir };
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return { path: process.cwd() };
  });

  r("file.listDir", async (params) => {
    const basePath = validatePath(params.path || process.cwd());
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
      log.error("listDir error", { error: err });
    }
    return { entries, basePath };
  });

  r("file.createFile", async (params) => {
    const dirPath = validatePath(params.dirPath);
    const filePath = join(dirPath, params.name);
    await writeFile(filePath, "");
    return { path: filePath };
  });

  r("file.createDir", async (params) => {
    const dirPath = validatePath(params.dirPath);
    const fullDirPath = join(dirPath, params.name);
    await mkdir(fullDirPath, { recursive: true });
    return { path: fullDirPath };
  });

  r("file.rename", async (params) => {
    const oldPath = validatePath(params.oldPath);
    const newPath = join(dirname(oldPath), params.newName);
    await rename(oldPath, newPath);
    return { newPath };
  });

  r("file.delete", async (params) => {
    const safePath = validatePath(params.path);
    await rm(safePath, { recursive: true, force: true });
    return { ok: true };
  });

  r("file.copy", async (params) => {
    const srcPath = validatePath(params.srcPath);
    const destDir = validatePath(params.destDir);
    const name = srcPath.split("/").pop() || srcPath;
    const destPath = join(destDir, name);
    await cp(srcPath, destPath, { recursive: true });
    return { path: destPath };
  });

  r("file.readFile", async (params) => {
    const filePath = validatePath(params.path);
    const content = await readFile(filePath);
    return { content: content.toString(), size: content.length };
  });
}
