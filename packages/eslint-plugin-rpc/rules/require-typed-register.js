/**
 * @fileoverview 入口文件必须导入 registerAllHandlers
 */
"use strict";

const DEFAULT_ENTRY_FILES = ["bun/index.ts", "gateway/ws-handler.ts"];

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
    schema: [
      {
        type: "object",
        properties: {
          entryFiles: {
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
    const options = context.options[0] || {};
    const entryFiles = options.entryFiles || DEFAULT_ENTRY_FILES;

    const isEntryPoint = entryFiles.some((entry) => filename.endsWith(entry));

    if (!isEntryPoint) return {};

    let localName = null;
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
              // Track the local alias so `import { registerAllHandlers as reg }`
              // counts when invoked as reg(server).
              localName = specifier.local.name;
              importNode = node;
            }
          }
        }
      },

      CallExpression(node) {
        if (node.callee.type === "Identifier" && localName && node.callee.name === localName) {
          hasRegisterAllHandlersCall = true;
        }
      },

      "Program:exit"() {
        if (!localName) {
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
