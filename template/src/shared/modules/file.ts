/**
 * File 模块 — 文件系统操作
 */
export interface FileMethods {
  "file.listDir": {
    params: { path: string };
    result: {
      entries: { name: string; path: string; type: "file" | "directory"; size?: number }[];
      basePath: string;
    };
  };
}
