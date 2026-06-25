/**
 * @dyyz1993/eslint-plugin-rpc / no-deep-relative-imports
 *
 * 禁止使用超过 maxDepth 层的 ../ 相对路径导入。
 * 应使用 tsconfig paths 中配置的别名（如 @shared/*）替代。
 *
 * 默认 maxDepth: 2（即 ../../../ 及以上被禁止）
 *
 * 正确:
 *   import { foo } from "@shared/modules/feed"
 *   import { bar } from "./sibling"
 *   import { baz } from "../parent"
 *   import { qux } from "../../grandparent"
 *
 * 错误:
 *   import { foo } from "../../../shared/modules/feed"
 *   import { bar } from "../../../../shared/http-routes"
 */
"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "禁止超过 2 层 ../ 的相对路径导入，应使用 @ 别名替代",
      category: "Import Conventions",
      recommended: true,
    },
    messages: {
      deepRelative:
        "禁止使用 '{{depth}}' 层相对路径 '{{path}}'。" +
        "应使用 tsconfig paths 中配置的别名（如 @shared/*）替代。\n" +
        "详见项目规范: .opencode/rules/import-conventions.md",
    },
    schema: [
      {
        type: "object",
        properties: {
          maxDepth: {
            type: "integer",
            minimum: 1,
            default: 2,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const options = context.options[0] || {};
    const maxDepth = options.maxDepth || 2;

    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== "string") return;

        const match = source.match(/^(\.\.\/)+/);
        if (!match) return;

        const depth = match[0].split("/").filter(Boolean).length;
        if (depth > maxDepth) {
          context.report({
            node: node.source,
            messageId: "deepRelative",
            data: {
              depth: String(depth),
              path: source,
            },
          });
        }
      },
    };
  },
};
