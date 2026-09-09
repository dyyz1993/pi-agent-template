/**
 * @fileoverview 强制前端使用 apiClient 进行 RPC 调用
 */
"use strict";

// Exact (case-insensitive) variable names treated as raw transports; a
// substring test would flag unrelated names like `browse` while missing
// `socket`.
const DEFAULT_TRANSPORT_NAMES = ["ws", "websocket", "socket"];

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
    schema: [
      {
        type: "object",
        properties: {
          transportNames: {
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

    if (!/mainview\/.*\.[jt]sx?$/.test(filename)) return {};

    const options = context.options[0] || {};
    const transportNames = (options.transportNames || DEFAULT_TRANSPORT_NAMES).map((n) =>
      n.toLowerCase()
    );

    const isWebSocketCallee = (callee) => {
      if (callee.type === "Identifier") return callee.name === "WebSocket";
      // window.WebSocket / globalThis.WebSocket
      return (
        callee.type === "MemberExpression" &&
        callee.property.type === "Identifier" &&
        callee.property.name === "WebSocket"
      );
    };

    return {
      NewExpression(node) {
        if (isWebSocketCallee(node.callee)) {
          context.report({ node, messageId: "useApiClient" });
        }
      },

      CallExpression(node) {
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.property.type === "Identifier" &&
          node.callee.property.name === "send" &&
          node.callee.object.type === "Identifier" &&
          transportNames.includes(node.callee.object.name.toLowerCase())
        ) {
          context.report({ node, messageId: "useApiClient" });
        }
      },
    };
  },
};
