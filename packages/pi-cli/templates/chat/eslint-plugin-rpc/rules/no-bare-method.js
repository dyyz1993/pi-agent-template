/**
 * @fileoverview 禁止使用裸方法名（无模块前缀）
 */

"use strict";

const METHOD_CALL_PATTERNS = [
  { calleePattern: /^register$/, argIndex: 0 },
  { calleePattern: /\.call$/, argIndex: 0 },
  { calleePattern: /\.subscribe$/, argIndex: 0 },
  { calleePattern: /\.emitEvent$/, argIndex: 0 },
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
    schema: [],
  },

  create(context) {
    const filename = context.getFilename();

    if (!/\.[jt]sx?$/.test(filename)) return {};

    return {
      CallExpression(node) {
        const { callee, arguments: args } = node;

        let calleeText = "";
        if (callee.type === "Identifier") {
          calleeText = callee.name;
        } else if (callee.type === "MemberExpression" && callee.property.type === "Identifier") {
          calleeText = `.${callee.property.name}`;
        }

        for (const pattern of METHOD_CALL_PATTERNS) {
          if (!pattern.calleePattern.test(calleeText)) continue;
          if (args.length <= pattern.argIndex) continue;

          const arg = args[pattern.argIndex];
          if (arg.type !== "Literal" || typeof arg.value !== "string") continue;

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
        }
      },
    };
  },
};
