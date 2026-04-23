export const AUTH_TOKEN = "pi-agent-template-token";
export const MAX_PREVIEW_SIZE = 500 * 1024; // 500KB

// TODO: 桌面端应通过 RPC 获取 (file.findProjectRoot)，Web 端用 process.cwd()
// 模板使用者应覆盖此值为自己的项目路径，或通过 RPC 动态获取
export const DEFAULT_PROJECT_ROOT = "/Users/xuyingzhou/Project/study-desktop/pi-agent-template/template";
