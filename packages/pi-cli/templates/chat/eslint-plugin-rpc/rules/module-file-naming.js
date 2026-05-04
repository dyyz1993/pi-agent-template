/**
 * @fileoverview 强制 RPC 模块文件的命名和导出规范
 */

"use strict";

function getModuleName(filename) {
  const match = filename.match(/\/modules\/([^/]+)\.[jt]sx?$/);
  return match ? match[1] : null;
}

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "RPC 模块文件必须遵循命名和导出规范",
      category: "RPC Conventions",
      recommended: "error",
    },
    messages: {
      missingMethodsExport:
        '模块文件 "{{file}}" 必须导出 "{{ModuleName}}Methods" 接口。',
      methodPrefixMismatch:
        '方法 "{{method}}" 的前缀不匹配模块 "{{module}}"。必须以 "{{module}}." 开头。',
      eventPrefixMismatch:
        '事件 "{{event}}" 的前缀不匹配模块 "{{module}}"。必须以 "{{module}}." 开头。',
    },
    schema: [],
  },

  create(context) {
    const filename = context.getFilename();
    const moduleName = getModuleName(filename);
    if (!moduleName) return {};

    const moduleNamePascal = moduleName
      .split(/[-_]/)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join("");

    let hasMethodsExport = false;

    return {
      TSInterfaceDeclaration(node) {
        const name = node.id.name;

        if (name === `${moduleNamePascal}Methods`) {
          hasMethodsExport = true;

          if (node.body && node.body.body) {
            for (const member of node.body.body) {
              if (member.type === "TSPropertySignature" && member.key) {
                const key =
                  member.key.type === "Literal" ? String(member.key.value) : null;
                if (key && !key.startsWith(`${moduleName}.`)) {
                  context.report({
                    node: member,
                    messageId: "methodPrefixMismatch",
                    data: { method: key, module: moduleName },
                  });
                }
              }
            }
          }
        }

        if (name === `${moduleNamePascal}Events`) {
          if (node.body && node.body.body) {
            for (const member of node.body.body) {
              if (member.type === "TSPropertySignature" && member.key) {
                const key =
                  member.key.type === "Literal" ? String(member.key.value) : null;
                if (key && !key.startsWith(`${moduleName}.`)) {
                  context.report({
                    node: member,
                    messageId: "eventPrefixMismatch",
                    data: { event: key, module: moduleName },
                  });
                }
              }
            }
          }
        }
      },

      "Program:exit"() {
        if (!hasMethodsExport) {
          context.report({
            loc: { line: 1, column: 0 },
            messageId: "missingMethodsExport",
            data: {
              file: filename.split("/").pop(),
              ModuleName: moduleNamePascal,
            },
          });
        }
      },
    };
  },
};
