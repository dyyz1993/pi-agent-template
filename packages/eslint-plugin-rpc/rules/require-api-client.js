/**
 * @fileoverview 强制前端使用 apiClient 进行 RPC 调用
 */

"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "前端 RPC 调用必须通过 apiClient",
      category: "RPC Conventions",
      recommended: "error",
    },
    messages: {
      useApiClient:
        "前端 RPC 调用必须通过 apiClient.call() / apiClient.subscribe()。禁止直接操作 WebSocket 或其他传输层。",
    },
    schema: [],
  },

  create(context) {
    const filename = context.getFilename();

    if (!/mainview\/.*\.[jt]sx?$/.test(filename)) return {};

    return {
      NewExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "WebSocket"
        ) {
          context.report({
            node,
            messageId: "useApiClient",
          });
        }
      },

      CallExpression(node) {
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.property.type === "Identifier" &&
          node.callee.property.name === "send"
        ) {
          if (node.callee.object.type === "Identifier") {
            const objName = node.callee.object.name.toLowerCase();
            if (objName.includes("websocket") || objName.includes("ws")) {
              context.report({
                node,
                messageId: "useApiClient",
              });
            }
          }
        }
      },
    };
  },
};
