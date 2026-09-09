---
"@dyyz1993/eslint-plugin-rpc": minor
---

Initial npm publish. ESLint rules for @dyyz1993/rpc-core conventions: fixed false positives (`fn.call()`, unrelated `register`/`send` receivers, aliased `registerAllHandlers` imports, `window.WebSocket`), activated the previously dead `ignoreComponents` option, added `export ... from` coverage to deep-import detection, made receiver names / entry files / handlers dirs configurable per rule, added a `flat/recommended` config for ESLint 9, and added a full RuleTester suite.
