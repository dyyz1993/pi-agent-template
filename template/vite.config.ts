import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: "src/mainview",
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      "@chat-agent/rpc-core": "/Users/xuyingzhou/Project/study-desktop/pi-agent-template/packages/rpc-core/src/index.ts",
    },
  },
});
