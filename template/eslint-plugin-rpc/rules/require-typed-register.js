/**
 * @fileoverview 强制使用 createTypedRegister 进行 handler 注册
 *
 * 所有调用 register() 的文件，必须先导入并调用 createTypedRegister。
 * 确保 RPC handler 注册始终有类型保护。
 */

"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "调用 register() 的文件必须导入 createTypedRegister",
      category: "RPC Conventions",
      recommended: "error",
    },
    messages: {
      missingImport:
        "使用了 register() 但未导入 createTypedRegister。必须从 \"../shared/typed-handlers\" 或 \"./shared/typed-handlers\" 导入。",
      missingCall:
        "使用了 register() 但未调用 createTypedRegister(server)。必须先创建类型安全的注册器。",
    },
    schema: [],
  },

  create(context) {
    const filename = context.getFilename();

    // 只检查 src/ 下的 .ts/.tsx 文件
    if (!/src\/.*\.[jt]sx?$/.test(filename)) return {};

    let hasTypedRegisterImport = false;
    let hasCreateTypedRegisterCall = false;
    const registerCalls = [];

    return {
      // 检查 import 声明
      ImportDeclaration(node) {
        if (
          node.source.type === "Literal" &&
          typeof node.source.value === "string" &&
          node.source.value.includes("typed-handlers")
        ) {
          for (const specifier of node.specifiers) {
            if (
              specifier.type === "ImportSpecifier" &&
              specifier.imported.name === "createTypedRegister"
            ) {
              hasTypedRegisterImport = true;
            }
          }
        }
      },

      // 检查 createTypedRegister() 调用
      CallExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "createTypedRegister"
        ) {
          hasCreateTypedRegisterCall = true;
        }
      },

      // 收集 register() 调用
      "CallExpression > Identifier[name='register']"(node) {
        // 只收集直接调用：register("xxx", ...)
        if (node.parent.type === "CallExpression" && node.parent.callee === node) {
          registerCalls.push(node.parent);
        }
      },

      "Program:exit"() {
        if (registerCalls.length === 0) return;

        if (!hasTypedRegisterImport) {
          for (const call of registerCalls) {
            context.report({
              node: call,
              messageId: "missingImport",
            });
          }
        } else if (!hasCreateTypedRegisterCall) {
          for (const call of registerCalls) {
            context.report({
              node: call,
              messageId: "missingCall",
            });
          }
        }
      },
    };
  },
};
