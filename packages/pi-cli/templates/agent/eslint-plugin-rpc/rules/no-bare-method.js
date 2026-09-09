/**
 * @fileoverview 禁止使用裸方法名（无模块前缀）
 */
"use strict";

// Object names whose .register/.call/.subscribe/.emitEvent are RPC entry
// points. Prefix matching covers numbered test doubles (serverA, apiClient2).
const DEFAULT_OBJECT_NAMES = [
  "server",
  "rpcServer",
  "apiClient",
  "rpcClient",
  "client",
  "api",
  "rpc",
];

const METHOD_CALL_PATTERNS = [
  { methodName: "register", argIndex: 0 },
  { methodName: "call", argIndex: 0 },
  { methodName: "subscribe", argIndex: 0 },
  { methodName: "emitEvent", argIndex: 0 },
];

function isModuleMethodName(name) {
  const parts = name.split(".");
  return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
}

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "RPC 方法名必须使用 module.action 格式（禁止裸方法名）",
      category: "RPC Conventions",
      recommended: "error",
    },
    messages: {
      bareMethod:
        'RPC 方法名 "{{name}}" 缺少模块前缀。必须使用 "module.action" 格式，如 "{{suggestion}}"。',
      invalidFormat:
        'RPC 方法名 "{{name}}" 格式错误。必须使用 "module.action" 格式（单一 "." 分隔）。',
    },
    schema: [
      {
        type: "object",
        properties: {
          objectNames: {
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

    if (!/\.[jt]sx?$/.test(filename)) return {};

    const options = context.options[0] || {};
    const objectNames = options.objectNames || DEFAULT_OBJECT_NAMES;

    const isRpcObject = (name) => objectNames.some((known) => name.startsWith(known));

    return {
      CallExpression(node) {
        const { callee, arguments: args } = node;

        // Only member calls (obj.register / obj.call / ...). Bare register()
        // and Function.prototype.call are not RPC entry points.
        if (
          callee.type !== "MemberExpression" ||
          callee.property.type !== "Identifier" ||
          callee.object.type !== "Identifier"
        ) {
          return;
        }

        const pattern = METHOD_CALL_PATTERNS.find(
          (p) => p.methodName === callee.property.name
        );
        if (!pattern) return;
        if (!isRpcObject(callee.object.name)) return;
        if (args.length <= pattern.argIndex) return;

        const arg = args[pattern.argIndex];
        if (arg.type !== "Literal" || typeof arg.value !== "string") return;

        const methodName = arg.value;

        if (!methodName.includes(".")) {
          const suggestion = `module.${methodName}`;
          context.report({
            node: arg,
            messageId: "bareMethod",
            data: { name: methodName, suggestion },
          });
        } else if (!isModuleMethodName(methodName)) {
          context.report({
            node: arg,
            messageId: "invalidFormat",
            data: { name: methodName },
          });
        }
      },
    };
  },
};
