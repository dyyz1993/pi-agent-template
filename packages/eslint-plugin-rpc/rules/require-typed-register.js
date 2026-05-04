/**
 * @fileoverview 入口文件必须导入 registerAllHandlers
 */

"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "入口文件必须导入并调用 registerAllHandlers",
      category: "RPC Conventions",
      recommended: "error",
    },
    messages: {
      missingRegisterAllHandlersImport:
        '入口文件必须导入 registerAllHandlers。请添加：import { registerAllHandlers } from "./shared/handlers/register-all-handlers";',
      missingRegisterAllHandlersCall:
        "已导入 registerAllHandlers 但未调用。请在创建 server 后调用 registerAllHandlers(server)。",
    },
    schema: [],
  },

  create(context) {
    const filename = context.getFilename();

    const isEntryPoint =
      filename.endsWith("bun/index.ts") || filename.endsWith("gateway/ws-handler.ts");

    if (!isEntryPoint) return {};

    let hasRegisterAllHandlersImport = false;
    let hasRegisterAllHandlersCall = false;
    let importNode = null;

    return {
      ImportDeclaration(node) {
        if (
          node.source.type === "Literal" &&
          typeof node.source.value === "string" &&
          node.source.value.includes("register-all-handlers")
        ) {
          for (const specifier of node.specifiers) {
            if (
              specifier.type === "ImportSpecifier" &&
              specifier.imported.name === "registerAllHandlers"
            ) {
              hasRegisterAllHandlersImport = true;
              importNode = node;
            }
          }
        }
      },

      CallExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "registerAllHandlers"
        ) {
          hasRegisterAllHandlersCall = true;
        }
      },

      "Program:exit"() {
        if (!hasRegisterAllHandlersImport) {
          context.report({
            loc: { line: 1, column: 0 },
            messageId: "missingRegisterAllHandlersImport",
          });
        } else if (!hasRegisterAllHandlersCall) {
          context.report({
            node: importNode,
            messageId: "missingRegisterAllHandlersCall",
          });
        }
      },
    };
  },
};
