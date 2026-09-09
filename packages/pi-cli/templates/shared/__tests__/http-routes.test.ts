import { describe, it, expect, vi, beforeEach } from "vitest";

function mockRes() {
	const state = { statusCode: 200, body: "", headers: {} as Record<string, string> };

	const res = {
		setHeader(key: string, val: string) {
			state.headers[key] = val;
		},
		writeHead(code: number, hdrs?: Record<string, string>) {
			state.statusCode = code;
			if (hdrs) Object.assign(state.headers, hdrs);
			return res;
		},
		end(data?: string) {
			if (data !== undefined) state.body = data;
		},
	};

	return { res, state };
}

function mockReq(url: string, opts?: { method?: string; headers?: Record<string, string> }) {
	return {
		url,
		method: opts?.method ?? "GET",
		headers: {
			"content-length": "0",
			...opts?.headers,
		},
		[Symbol.asyncIterator]() {
			return { next: () => Promise.resolve({ done: true }) };
		},
	};
}

const config = {
	port: 3000,
	authToken: "test-token",
	maxUploadSize: 1024 * 1024 * 10,
	corsOrigin: "*",
};

describe("HTTP Routes (shared)", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("/health returns ok status", async () => {
		const { createHttpHandler } = await import("../http-routes");
		const handler = createHttpHandler({
			config,
			getWebSocketClientCount: () => 3,
		});

		const { res, state } = mockRes();
		await handler(mockReq("/health"), res);

		expect(state.statusCode).toBe(200);
		const parsed = JSON.parse(state.body);
		expect(parsed.status).toBe("ok");
		expect(parsed.clients).toBe(3);
	});

	it("returns 401 without auth token", async () => {
		const { createHttpHandler } = await import("../http-routes");
		const handler = createHttpHandler({
			config,
			getWebSocketClientCount: () => 0,
		});

		const { res, state } = mockRes();
		await handler(mockReq("/file/test.txt"), res);

		expect(state.statusCode).toBe(401);
		expect(JSON.parse(state.body).error).toBe("Unauthorized");
	});

	it("accepts Bearer token in Authorization header", async () => {
		const { createHttpHandler } = await import("../http-routes");
		const handler = createHttpHandler({
			config,
			getWebSocketClientCount: () => 0,
		});

		const { res, state } = mockRes();
		await handler(
			mockReq("/info/nonexistent", {
				headers: { authorization: "Bearer test-token" },
			}),
			res
		);

		expect(state.statusCode).not.toBe(401);
	});

	it("accepts token in query parameter", async () => {
		const { createHttpHandler } = await import("../http-routes");
		const handler = createHttpHandler({
			config,
			getWebSocketClientCount: () => 0,
		});

		const { res, state } = mockRes();
		await handler(mockReq("/info/nonexistent?token=test-token"), res);

		expect(state.statusCode).not.toBe(401);
	});

	it("handles CORS preflight OPTIONS", async () => {
		const { createHttpHandler } = await import("../http-routes");
		const handler = createHttpHandler({
			config,
			getWebSocketClientCount: () => 0,
		});

		const { res, state } = mockRes();
		await handler(mockReq("/health", { method: "OPTIONS" }), res);

		expect(state.statusCode).toBe(204);
		expect(state.headers["Access-Control-Allow-Origin"]).toBe("*");
	});

	it("returns 400 for request without url", async () => {
		const { createHttpHandler } = await import("../http-routes");
		const handler = createHttpHandler({
			config,
			getWebSocketClientCount: () => 0,
		});

		const { res, state } = mockRes();
		await handler({ method: "GET", headers: {} }, res);

		expect(state.statusCode).toBe(400);
	});

	it("returns 404 for unknown routes", async () => {
		const { createHttpHandler } = await import("../http-routes");
		const handler = createHttpHandler({
			config,
			getWebSocketClientCount: () => 0,
		});

		const { res, state } = mockRes();
		await handler(
			mockReq("/unknown", {
				headers: { authorization: "Bearer test-token" },
			}),
			res
		);

		expect(state.statusCode).toBe(404);
	});

	it("/file/upload without path returns 400", async () => {
		const { createHttpHandler } = await import("../http-routes");
		const handler = createHttpHandler({
			config,
			getWebSocketClientCount: () => 0,
		});

		const { res, state } = mockRes();
		await handler(
			mockReq("/file/upload", {
				method: "POST",
				headers: { authorization: "Bearer test-token" },
			}),
			res
		);

		expect(state.statusCode).toBe(400);
		expect(JSON.parse(state.body).error).toContain("Missing path");
	});
});
