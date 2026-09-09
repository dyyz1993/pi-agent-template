/**
 * Rule tests for eslint-plugin-rpc. Run with: bun test tests/
 *
 * TS/JSX cases use @typescript-eslint/parser (resolved from the monorepo
 * root); filename-dependent rules get an explicit per-case filename.
 */
"use strict";

const { RuleTester } = require("eslint");
const { describe, it } = require("bun:test");

const tsParser = require("@typescript-eslint/parser");

// bun:test provides describe/it via imports; point RuleTester at them.
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester();

const ts = {
	languageOptions: { parser: tsParser },
};

ruleTester.run("no-bare-method", require("../rules/no-bare-method"), {
	valid: [
		{ code: `apiClient.call("feed.load", {})`, filename: "src/App.ts" },
		{ code: `apiClient.subscribe("chat.delta", handler)`, filename: "src/App.ts" },
		{ code: `server.register("chat.send", handler)`, filename: "src/handlers/chat.ts" },
		{ code: `server.emitEvent("timer.tick", payload)`, filename: "src/handlers/timer.ts" },
		// Function.prototype.call / unrelated helpers must not be flagged
		{ code: `slice.call("abc")`, filename: "src/utils.ts" },
		{ code: `fn.call(this, "hello world")`, filename: "src/utils.ts" },
		{ code: `register("user-route")`, filename: "src/routes.ts" },
		{ code: `router.register("user-route")`, filename: "src/routes.ts" },
		// numbered test doubles
		{ code: `serverA.call("chat.echo", {})`, filename: "src/__tests__/chat.test.ts" },
	],
	invalid: [
		{
			code: `apiClient.call("loadFeed", {})`,
			filename: "src/App.ts",
			errors: [{ messageId: "bareMethod" }],
		},
		{
			code: `server.register("a.b.c", handler)`,
			filename: "src/handlers/chat.ts",
			errors: [{ messageId: "invalidFormat" }],
		},
	],
});

ruleTester.run("no-direct-register", require("../rules/no-direct-register"), {
	valid: [
		{
			code: `server.register("chat.send", handler)`,
			filename: "project/src/shared/handlers/chat.ts",
			...ts,
		},
		{
			code: `myRegistry.register("chat.send")`,
			filename: "project/src/somewhere/file.ts",
			...ts,
		},
	],
	invalid: [
		{
			code: `server.register("chat.send", handler)`,
			filename: "project/src/somewhere/file.ts",
			...ts,
			errors: [{ messageId: "noDirectRegisterGeneral" }],
		},
		{
			code: `server.register("chat.send", handler)`,
			filename: "project/src/bun/index.ts",
			...ts,
			errors: [{ messageId: "noDirectRegisterInEntry" }],
		},
	],
});

ruleTester.run("schema-merge-only", require("../rules/schema-merge-only"), {
	valid: [
		{
			code: `export interface RPCMethods extends FeedMethods, ChatMethods {}`,
			filename: "project/src/shared/rpc-schema.ts",
			...ts,
		},
		{
			// type alias merging only references is fine
			code: `export type RPCMethods = FeedMethods & ChatMethods;`,
			filename: "project/src/shared/rpc-schema.ts",
			...ts,
		},
		{
			// basename must match exactly — my-rpc-schema.ts is a different file
			code: `export interface RPCMethods { "x.y": { params: unknown; result: unknown }; }`,
			filename: "project/src/shared/my-rpc-schema.ts",
			...ts,
		},
	],
	invalid: [
		{
			code: `export interface RPCMethods extends FeedMethods { "x.y": { params: unknown; result: unknown }; }`,
			filename: "project/src/shared/rpc-schema.ts",
			...ts,
			errors: [{ messageId: "noDirectDefinition" }],
		},
		{
			code: `export type RPCEvents = FeedEvents & { "x.changed": unknown };`,
			filename: "project/src/shared/rpc-schema.ts",
			...ts,
			errors: [{ messageId: "noDirectDefinition" }],
		},
	],
});

ruleTester.run("module-file-naming", require("../rules/module-file-naming"), {
	valid: [
		{
			code: `
				export interface FeedMethods {
					"feed.load": { params: {}; result: {} };
				}
				export interface FeedEvents {
					"feed.changed": unknown;
				}
			`,
			filename: "project/src/shared/modules/feed.ts",
			...ts,
		},
		{
			// index.ts layout is also a module file
			code: `
				export interface FeedMethods {
					"feed.load": { params: {}; result: {} };
				}
			`,
			filename: "project/src/shared/modules/feed/index.ts",
			...ts,
		},
		{
			code: `export const x = 1;`,
			filename: "project/src/shared/handlers/feed.ts",
			...ts,
		},
	],
	invalid: [
		{
			// interface declared but not exported
			code: `interface FeedMethods { "feed.load": { params: {}; result: {} }; }`,
			filename: "project/src/shared/modules/feed.ts",
			...ts,
			errors: [{ messageId: "missingMethodsExport" }],
		},
		{
			code: `export interface FeedMethods { "loadAll": { params: {}; result: {} }; }`,
			filename: "project/src/shared/modules/feed.ts",
			...ts,
			errors: [{ messageId: "methodPrefixMismatch" }],
		},
		{
			// Identifier keys are checked too (they can never carry the prefix)
			code: `export interface FeedMethods { loadAll: { params: {}; result: {} }; }`,
			filename: "project/src/shared/modules/feed.ts",
			...ts,
			errors: [{ messageId: "methodPrefixMismatch" }],
		},
		{
			code: `export interface FeedMethods { "feed.load": {} }
				export interface FeedEvents { changed: unknown; }`,
			filename: "project/src/shared/modules/feed.ts",
			...ts,
			errors: [{ messageId: "eventPrefixMismatch" }],
		},
	],
});

ruleTester.run("require-typed-register", require("../rules/require-typed-register"), {
	valid: [
		{
			code: `
				import { registerAllHandlers } from "./shared/handlers/register-all-handlers";
				registerAllHandlers(server);
			`,
			filename: "project/src/bun/index.ts",
			...ts,
		},
		{
			// aliased import must be recognized when invoked under its local name
			code: `
				import { registerAllHandlers as reg } from "./shared/handlers/register-all-handlers";
				reg(server);
			`,
			filename: "project/src/bun/index.ts",
			...ts,
		},
		{
			code: `const x = 1;`,
			filename: "project/src/mainview/App.tsx",
			...ts,
		},
	],
	invalid: [
		{
			code: `const server = null;`,
			filename: "project/src/bun/index.ts",
			...ts,
			errors: [{ messageId: "missingRegisterAllHandlersImport" }],
		},
		{
			code: `import { registerAllHandlers } from "./shared/handlers/register-all-handlers";`,
			filename: "project/src/bun/index.ts",
			...ts,
			errors: [{ messageId: "missingRegisterAllHandlersCall" }],
		},
	],
});

ruleTester.run("require-api-client", require("../rules/require-api-client"), {
	valid: [
		{
			code: `const r = await apiClient.call("feed.load", {});`,
			filename: "project/src/mainview/App.tsx",
			...ts,
		},
		{
			// substring match on "ws" must not flag unrelated variables
			code: `browse.send("hello");`,
			filename: "project/src/mainview/App.tsx",
			...ts,
		},
		{
			code: `const ws = new WebSocket("ws://localhost");`,
			filename: "project/src/gateway/connection.ts",
			...ts,
		},
	],
	invalid: [
		{
			code: `const ws = new WebSocket("ws://localhost");`,
			filename: "project/src/mainview/App.tsx",
			...ts,
			errors: [{ messageId: "useApiClient" }],
		},
		{
			// window.WebSocket used to escape detection
			code: `const ws = new window.WebSocket("ws://localhost");`,
			filename: "project/src/mainview/App.tsx",
			...ts,
			errors: [{ messageId: "useApiClient" }],
		},
		{
			code: `ws.send(JSON.stringify(msg));`,
			filename: "project/src/mainview/App.tsx",
			...ts,
			errors: [{ messageId: "useApiClient" }],
		},
	],
});

ruleTester.run("no-hardcoded-strings", require("../rules/no-hardcoded-strings"), {
	valid: [
		{
			code: `const el = <div className="p-4 text-sm">42</div>;`,
			filename: "file.tsx",
			...ts,
		},
		{
			// href attribute ignored by default; URL values ignored by prefix
			code: `const el = <a href="https://example.com" />;`,
			filename: "file.tsx",
			...ts,
		},
		{
			code: `const el = <Icon label="Save" />;`,
			options: [{ ignoreComponents: ["Icon"] }],
			filename: "file.tsx",
			...ts,
		},
		{
			code: `const el = <Panel header="Settings"><Icon label="Save" /></Panel>;`,
			options: [{ ignoreComponents: ["Panel"] }],
			filename: "file.tsx",
			...ts,
		},
		{
			code: `const el = <div style={{ width: "var(--x)" }}>42</div>;`,
			filename: "file.tsx",
			...ts,
		},
	],
	invalid: [
		{
			code: `const el = <div>Hello World</div>;`,
			filename: "file.tsx",
			...ts,
			errors: [{ messageId: "hardcodedString" }],
		},
		{
			code: `const el = <Button title="Save changes" />;`,
			filename: "file.tsx",
			...ts,
			errors: [{ messageId: "hardcodedString" }],
		},
		{
			// ignoreComponents off by default: Icon strings still flagged
			code: `const el = <Icon label="Save" />;`,
			filename: "file.tsx",
			...ts,
			errors: [{ messageId: "hardcodedString" }],
		},
	],
});

ruleTester.run("no-deep-relative-imports", require("../rules/no-deep-relative-imports"), {
	valid: [
		{ code: `import { a } from "./sibling";`, filename: "src/a.ts" },
		{ code: `import { a } from "../parent";`, filename: "src/a.ts" },
		{ code: `import { a } from "../../grandparent";`, filename: "src/a.ts" },
		{ code: `import { a } from "@shared/modules/feed";`, filename: "src/a.ts" },
		{ code: `export { a } from "../parent";`, filename: "src/a.ts" },
	],
	invalid: [
		{
			code: `import { a } from "../../../shared/modules/feed";`,
			filename: "src/a.ts",
			errors: [{ messageId: "deepRelative" }],
		},
		{
			// re-exports used to escape detection entirely
			code: `export { a } from "../../../shared/foo";`,
			filename: "src/a.ts",
			errors: [{ messageId: "deepRelative" }],
		},
		{
			code: `export * from "../../../../shared/http-routes";`,
			filename: "src/a.ts",
			errors: [{ messageId: "deepRelative" }],
		},
	],
});
