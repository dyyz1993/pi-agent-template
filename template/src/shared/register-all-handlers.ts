import type { RPCServer } from "@chat-agent/rpc-core";
import type { HandlerOptions } from "./rpc-schema";

type HandlerModule = { register: (server: RPCServer, options: HandlerOptions) => void };

/**
 * 自动发现 handlers/ 目录下所有模块并注册
 *
 * 每个文件必须导出 register(server, options) 函数
 * 新增模块：只需创建 handlers/<module>.ts，无需修改此文件
 */
export async function registerAllHandlers(server: RPCServer, options: HandlerOptions): Promise<void> {
  const { readdir } = await import("fs/promises");
  const { join } = await import("path");
  const handlerDir = join(import.meta.dir, "handlers");

  let files: string[];
  try {
    files = (await readdir(handlerDir)).filter((f) => f.endsWith(".ts"));
  } catch {
    return;
  }

  for (const file of files) {
    const mod = (await import(join(handlerDir, file))) as HandlerModule;
    if (mod && typeof mod.register === "function") {
      mod.register(server, options);
    }
  }
}
