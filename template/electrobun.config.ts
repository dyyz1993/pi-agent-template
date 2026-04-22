import type { ElectrobunConfig } from "electrobun";

export default {
  app: {
    name: "pi-agent-template",
    identifier: "com.piagent.template",
    version: "1.0.0",
  },
  build: {
    bun: {
      entrypoint: "src/bun/index.ts",
    },
    copy: {
      "src/dist/index.html": "views/mainview/index.html",
      "src/dist/assets": "views/mainview/assets",
      "src/rpc-browser.js": "views/mainview/rpc-browser.js",
    },
    mac: {
      bundleCEF: false,
    },
    linux: {
      bundleCEF: false,
    },
    win: {
      bundleCEF: false,
    },
  },
} satisfies ElectrobunConfig;
