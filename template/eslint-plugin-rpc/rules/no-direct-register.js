/**
 * @fileoverview 禁止直接使用 server.register()，必须使用 createTypedRegister
 *
 * 所有 RPC handler 注册必须通过 createTypedRegister() 创建的 register 函数，
 * 以确保 params 和返回值的类型安全。
 */

"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "禁止直接使用 server.register()，必须使用 createTypedRegister()",
      category: "RPC Conventions",
      recommended: "error",
    },
    messages: {
      noDirectRegister:
        "禁止直接调用 server.register()。必须使用 createTypedRegister(server) 创建的 register 函数来确保类型安全。",
    },
    schema: [],
  },

  create(context) {
    const filename = context.getFilename();

    // 只检查 src/ 下的 .ts/.tsx 文件
    if (!/src\/.*\.[jt]sx?$/.test(filename)) return {};

    return {
      CallExpression(node) {
        const { callee } = node;

        // 检测 xxx.register("...", ...) 模式
        if (
          callee.type === "MemberExpression" &&
          callee.property.type === "Identifier" &&
          callee.property.name === "register" &&
          callee.object.type === "Identifier"
        ) {
          const objectName = callee.object.name;

          // 允许的模式：RPCServer.prototype.register (内部实现)
          // 禁止的模式：server.register(), rpcServer.register() 等
          const serverVarNames = ["server", "rpcServer", "rpc", "rpc_server"];

          if (serverVarNames.includes(objectName)) {
            context.report({
              node,
              messageId: "noDirectRegister",
            });
          }
        }
      },
    };
  },
};
