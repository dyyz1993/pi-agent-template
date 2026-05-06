import { test as base, expect } from "@playwright/test";

const E2E_WS_URL = process.env.E2E_WS_URL || "";
const E2E_TOKEN = process.env.E2E_TOKEN || "";
const QUERY_SUFFIX =
	E2E_WS_URL && E2E_TOKEN
		? `?ws=${encodeURIComponent(E2E_WS_URL)}&token=${encodeURIComponent(E2E_TOKEN)}`
		: "";

export interface BrowserError {
	type: "console:error" | "pageerror" | "requestfailed";
	text: string;
	url?: string;
}

export const test = base.extend<{
	browserErrors: BrowserError[];
}>({
	page: async ({ page }, use) => {
		if (QUERY_SUFFIX) {
			const origGoto = page.goto.bind(page);
			// @ts-expect-error overriding page.goto to inject E2E query params
			page.goto = (url: string, options?: Parameters<typeof origGoto>[1]) => {
				if (typeof url === "string" && (url === "/" || url === "")) {
					return origGoto(`/${QUERY_SUFFIX}`, options);
				}
				return origGoto(url, options);
			};
		}
		await use(page);
	},
	browserErrors: [
		async ({ page }, use) => {
			const errors: BrowserError[] = [];

			page.on("console", (msg) => {
				if (msg.type() === "error") {
					errors.push({
						type: "console:error",
						text: msg.text(),
						url: page.url(),
					});
				}
			});

			page.on("pageerror", (error) => {
				errors.push({
					type: "pageerror",
					text: error.message,
					url: page.url(),
				});
			});

			page.on("requestfailed", (request) => {
				errors.push({
					type: "requestfailed",
					text: `${request.method()} ${request.url()} — ${request.failure()?.errorText ?? "unknown"}`,
					url: request.url(),
				});
			});

			await use(errors);

			const filtered = errors.filter(
				(e) =>
					!e.text.includes("favicon") &&
					!e.text.includes("404") &&
					!e.text.includes("net::ERR_CONNECTION_REFUSED") &&
					!e.text.includes("WebSocket")
			);

			if (filtered.length > 0) {
				console.error(
					`\n❌ Browser errors detected during test:\n` +
						filtered.map((e) => `  [${e.type}] ${e.text}`).join("\n")
				);
			}
			expect(filtered).toEqual([]);
		},
		{ auto: true },
	],
});

export { expect };
