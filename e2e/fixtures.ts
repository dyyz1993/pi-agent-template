import { test as base, expect } from "@playwright/test";

const E2E_WS_URL = process.env.E2E_WS_URL || "";
const E2E_TOKEN = process.env.E2E_TOKEN || "";

export interface BrowserError {
	type: "console:error" | "pageerror" | "requestfailed";
	text: string;
	url?: string;
}

export const test = base.extend<{
	browserErrors: BrowserError[];
}>({
	page: async ({ page }, use) => {
		if (E2E_WS_URL && E2E_TOKEN) {
			await page.addInitScript(
				({ wsUrl, token }) => {
					localStorage.setItem("rpc-websocket-url", wsUrl);
					localStorage.setItem("rpc-auth-token", token);
				},
				{ wsUrl: E2E_WS_URL, token: E2E_TOKEN }
			);
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
