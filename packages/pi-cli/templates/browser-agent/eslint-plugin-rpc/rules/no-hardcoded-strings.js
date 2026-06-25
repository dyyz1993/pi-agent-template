"use strict";

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "disallow hardcoded strings in JSX (use i18n t() instead)",
      category: "Best Practices",
      recommended: false,
    },
    fixable: null,
    schema: [
      {
        type: "object",
        properties: {
          ignoreAttributes: {
            type: "array",
            items: { type: "string" },
          },
          ignoreComponents: {
            type: "array",
            items: { type: "string" },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      hardcodedString:
        'Hardcoded string "{{text}}" should use i18n translation (t()).',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const ignoreAttributes = new Set(options.ignoreAttributes || ["className", "style", "id", "key", "ref", "type", "name", "data-testid", "viewBox", "d", "points", "x1", "x2", "y1", "y2", "strokeWidth", "strokeLinecap", "strokeLinejoin", "fill", "stroke", "xmlns"]);
    new Set(options.ignoreComponents || []);

    return {
      JSXText(node) {
        const text = node.value.trim();
        if (text.length > 1 && /[a-zA-Z]{2,}/.test(text)) {
          context.report({
            node,
            messageId: "hardcodedString",
            data: { text },
          });
        }
      },
      JSXAttribute(node) {
        if (ignoreAttributes.has(node.name.name)) return;
        if (
          node.value &&
          node.value.type === "Literal" &&
          typeof node.value.value === "string"
        ) {
          const text = node.value.value.trim();
          if (text.length > 3 && /[a-zA-Z]{3,}/.test(text) && !text.startsWith("var(") && !text.startsWith("bg-") && !text.startsWith("text-") && !text.startsWith("border-")) {
            context.report({
              node,
              messageId: "hardcodedString",
              data: { text },
            });
          }
        }
      },
    };
  },
};
