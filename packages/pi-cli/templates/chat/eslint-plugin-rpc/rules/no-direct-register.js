/**
 * @fileoverview server.register() 只允许在 shared/handlers/ 目录内使用
 */

"use strict";

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
    schema: [],
  },

  create(context) {
    const filename = context.getFilename();

    if (!/src\/.*\.[jt]sx?$/.test(filename)) return {};

    if (filename.includes("shared/handlers/")) return {};

    const isEntryPoint =
      filename.endsWith("bun/index.ts") || filename.endsWith("server.ts");

    return {
      CallExpression(node) {
        const { callee } = node;

        if (
          callee.type === "MemberExpression" &&
          callee.property.type === "Identifier" &&
          callee.property.name === "register" &&
          callee.object.type === "Identifier"
        ) {
          const objectName = callee.object.name;

          const serverVarNames = [
            "server",
            "rpcServer",
            "rpc",
            "rpc_server",
          ];

          if (serverVarNames.includes(objectName)) {
            context.report({
              node,
              messageId: isEntryPoint
                ? "noDirectRegisterInEntry"
                : "noDirectRegisterGeneral",
            });
          }
        }
      },
    };
  },
};
