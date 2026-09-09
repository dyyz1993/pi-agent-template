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
          ignorePrefixes: {
            type: "array",
            items: { type: "string" },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      hardcodedString: 'Hardcoded string "{{text}}" should use i18n translation (t()).',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const ignoreAttributes = new Set(
      options.ignoreAttributes || [
        "className",
        "style",
        "id",
        "key",
        "ref",
        "type",
        "name",
        "href",
        "src",
        "data-testid",
        "viewBox",
        "d",
        "points",
        "x1",
        "x2",
        "y1",
        "y2",
        "strokeWidth",
        "strokeLinecap",
        "strokeLinejoin",
        "fill",
        "stroke",
        "xmlns",
      ]
    );
    const ignoreComponents = new Set(options.ignoreComponents || []);
    const ignorePrefixes = options.ignorePrefixes || [
      "var(",
      "bg-",
      "text-",
      "border-",
      "http://",
      "https://",
      "data:",
      "mailto:",
    ];

    // Anywhere inside an ignored component (e.g. <Icon label="x" />) is exempt.
    // Element names are JSXIdentifier (<Icon>), not Identifier.
    const getComponentName = (nameNode) => {
      if (!nameNode) return null;
      if (nameNode.type === "JSXIdentifier" || nameNode.type === "Identifier") {
        return nameNode.name;
      }
      if (nameNode.type === "JSXMemberExpression" && nameNode.object) {
        return getComponentName(nameNode.object);
      }
      return null;
    };

    const isInsideIgnoredComponent = (node) => {
      let current = node;
      while (current && current.type !== "Program") {
        if (current.type === "JSXOpeningElement") {
          const name = getComponentName(current.name);
          if (name && ignoreComponents.has(name)) return true;
        }
        // For nested children, the enclosing tag's opening element is a child
        // of its JSXElement, not an ancestor — check it from the element.
        if (current.type === "JSXElement" && current.openingElement) {
          const name = getComponentName(current.openingElement.name);
          if (name && ignoreComponents.has(name)) return true;
        }
        current = current.parent;
      }
      return false;
    };

    const hasIgnoredPrefix = (text) => ignorePrefixes.some((prefix) => text.startsWith(prefix));

    return {
      JSXText(node) {
        if (ignoreComponents.size > 0 && isInsideIgnoredComponent(node)) return;
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
        if (ignoreComponents.size > 0 && isInsideIgnoredComponent(node)) return;
        if (
          node.value &&
          node.value.type === "Literal" &&
          typeof node.value.value === "string"
        ) {
          const text = node.value.value.trim();
          if (
            text.length > 3 &&
            /[a-zA-Z]{3,}/.test(text) &&
            !hasIgnoredPrefix(text)
          ) {
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
