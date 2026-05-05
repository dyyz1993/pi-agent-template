import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { readFileSync, existsSync } from "fs";

export function createViteConfig(dirname: string) {
  const PORT_FILE = resolve(dirname, ".server-port");

  function getBackendPort(): number {
    if (existsSync(PORT_FILE)) {
      try {
        return parseInt(readFileSync(PORT_FILE, "utf-8").trim());
      } catch {
        /* fall through */
      }
    }
    return parseInt(process.env.PORT || "3100");
  }

  const backendPort = getBackendPort();

  return defineConfig({
    plugins: [react()],
    root: "src/mainview",
    build: {
      outDir: "../../dist",
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-react": ["react", "react-dom"],
            "vendor-state": ["zustand"],
            "vendor-i18n": ["i18next", "react-i18next"],
          },
        },
      },
    },
    server: {
      port: parseInt(process.env.VITE_PORT || "5173"),
      strictPort: false,
      watch: {
        ignored: [".workspace/**"],
      },
      proxy: {
        "/health": {
          target: `http://localhost:${backendPort}`,
          changeOrigin: true,
        },
        "/info": {
          target: `http://localhost:${backendPort}`,
          changeOrigin: true,
        },
        "/file": {
          target: `http://localhost:${backendPort}`,
          changeOrigin: true,
        },
        "/upload": {
          target: `http://localhost:${backendPort}`,
          changeOrigin: true,
        },
        "/api": {
          target: `http://localhost:${backendPort}`,
          changeOrigin: true,
          ws: true,
        },
        "/ws": { target: `ws://localhost:${backendPort}`, ws: true },
      },
    },
    resolve: {
      alias: {
        "@dyyz1993/rpc-core": resolve(
          dirname,
          "..",
          "..",
          "packages",
          "rpc-core",
          "src",
          "index.ts"
        ),
        "@shared": resolve(dirname, "..", "shared"),
      },
    },
  });
}
