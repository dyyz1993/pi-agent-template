/**
 * @fileoverview server.register() 只允许在 shared/handlers/ 目录内使用
 */
"use strict";

const DEFAULT_SERVER_NAMES = ["server", "rpcServer", "rpc", "rpc_server"];

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "server.register() 只允许在 shared/handlers/ 目录内使用，入口文件和其他文件禁止直接调用",
      category: "RPC Conventions",
      recommended: "error",
    },
    messages: {
      noDirectRegisterInEntry:
        "入口文件禁止直接调用 server.register()。请导入并使用 registerAllHandlers() 统一注册 handler。",
      noDirectRegisterGeneral:
        "禁止直接调用 server.register()。Handler 注册只能在 shared/handlers/ 目录内的文件中进行。",
    },
    schema: [
      {
        type: "object",
        properties: {
          serverNames: {
            type: "array",
            items: { type: "string" },
          },
          entryFiles: {
            type: "array",
            items: { type: "string" },
          },
          handlersDirs: {
            type: "array",
            items: { type: "string" },
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const filename = context.getFilename();

    if (!/[/\\]src[/\\].*\.[jt]sx?$/.test(filename)) return {};

    const options = context.options[0] || {};
    const serverNames = options.serverNames || DEFAULT_SERVER_NAMES;
    const entryFiles = options.entryFiles || ["bun/index.ts", "server.ts"];
    const handlersDirs = options.handlersDirs || ["shared/handlers"];

    const isInHandlersDir = handlersDirs.some((dir) =>
      filename.includes(`/${dir}/`)
    );
    if (isInHandlersDir) return {};

    const isEntryPoint = entryFiles.some((entry) => filename.endsWith(entry));

    return {
      CallExpression(node) {
        const { callee } = node;

        if (
          callee.type === "MemberExpression" &&
          callee.property.type === "Identifier" &&
          callee.property.name === "register" &&
          callee.object.type === "Identifier" &&
          serverNames.includes(callee.object.name)
        ) {
          context.report({
            node,
            messageId: isEntryPoint ? "noDirectRegisterInEntry" : "noDirectRegisterGeneral",
          });
        }
      },
    };
  },
};
