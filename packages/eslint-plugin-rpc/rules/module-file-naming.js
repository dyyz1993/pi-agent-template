/**
 * @fileoverview 强制 RPC 模块文件的命名和导出规范
 */
"use strict";

// Matches both modules/<name>.ts and modules/<name>/index.ts layouts.
const MODULE_FILE_RE = /[/\\]modules[/\\]([^/\\]+)(?:[/\\]index)?\.[jt]sx?$/;

function getModuleName(filename) {
  const match = filename.match(MODULE_FILE_RE);
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

    const checkPrefixes = (node, messageId) => {
      if (!node.body || !node.body.body) return;
      for (const member of node.body.body) {
        if (member.type !== "TSPropertySignature" || !member.key) continue;
        const key =
          member.key.type === "Literal"
            ? String(member.key.value)
            : member.key.type === "Identifier"
              ? member.key.name
              : null;
        if (key && !key.startsWith(`${moduleName}.`)) {
          context.report({
            node: member,
            messageId,
            data: { [messageId === "methodPrefixMismatch" ? "method" : "event"]: key, module: moduleName },
          });
        }
      }
    };

    return {
      TSInterfaceDeclaration(node) {
        const name = node.id.name;

        if (name === `${moduleNamePascal}Methods`) {
          // Only an exported interface satisfies the schema merge contract.
          const isExported =
            node.parent && node.parent.type === "ExportNamedDeclaration";
          if (isExported) {
            hasMethodsExport = true;
          }
          checkPrefixes(node, "methodPrefixMismatch");
        }

        if (name === `${moduleNamePascal}Events`) {
          checkPrefixes(node, "eventPrefixMismatch");
        }
      },

      "Program:exit"() {
        if (!hasMethodsExport) {
          context.report({
            loc: { line: 1, column: 0 },
            messageId: "missingMethodsExport",
            data: {
              file: filename.split(/[/\\]/).pop(),
              ModuleName: moduleNamePascal,
            },
          });
        }
      },
    };
  },
};
