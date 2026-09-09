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

describe("CORS 安全", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("混合模式下默认 CORS 允许所有来源", async () => {
		const { createHttpHandler } = await import("../http-routes");
		const handler = createHttpHandler({
			config: {
				port: 3000,
				authToken: "test-token",
				maxUploadSize: 1024 * 1024,
				corsOrigin: "*",
			},
			getWebSocketClientCount: () => 0,
		});

		const { res, state } = mockRes();
		await handler(mockReq("/health"), res);

		expect(state.headers["Access-Control-Allow-Origin"]).toBe("*");
	});

	it("显式设置 CORS_ORIGIN 时只允许指定来源", async () => {
		const { createHttpHandler } = await import("../http-routes");
		const handler = createHttpHandler({
			config: {
				port: 3000,
				authToken: "test-token",
				maxUploadSize: 1024 * 1024,
				corsOrigin: "http://localhost:5173",
			},
			getWebSocketClientCount: () => 0,
		});

		const { res, state } = mockRes();
		await handler(mockReq("/health"), res);

		expect(state.headers["Access-Control-Allow-Origin"]).toBe("http://localhost:5173");
		expect(state.headers["Access-Control-Allow-Origin"]).not.toBe("*");
	});

	it("OPTIONS 预检请求返回正确的 CORS headers", async () => {
		const { createHttpHandler } = await import("../http-routes");
		const handler = createHttpHandler({
			config: {
				port: 3000,
				authToken: "test-token",
				maxUploadSize: 1024 * 1024,
				corsOrigin: "http://localhost:5173",
			},
			getWebSocketClientCount: () => 0,
		});

		const { res, state } = mockRes();
		await handler(mockReq("/file/some/path", { method: "OPTIONS" }), res);

		expect(state.statusCode).toBe(204);
		expect(state.headers["Access-Control-Allow-Origin"]).toBe("http://localhost:5173");
		expect(state.headers["Access-Control-Allow-Methods"]).toBe("GET, POST, OPTIONS");
		expect(state.headers["Access-Control-Allow-Headers"]).toContain("Authorization");
		expect(state.headers["Access-Control-Allow-Headers"]).toContain("Content-Type");
	});

	it("非预检请求也返回 CORS headers", async () => {
		const { createHttpHandler } = await import("../http-routes");
		const handler = createHttpHandler({
			config: {
				port: 3000,
				authToken: "test-token",
				maxUploadSize: 1024 * 1024,
				corsOrigin: "http://localhost:5173",
			},
			getWebSocketClientCount: () => 0,
		});

		const { res, state } = mockRes();
		await handler(
			mockReq("/info/nonexistent", {
				headers: { authorization: "Bearer test-token" },
			}),
			res
		);

		expect(state.statusCode).not.toBe(204);
		expect(state.headers["Access-Control-Allow-Origin"]).toBe("http://localhost:5173");
	});

	it("401 响应也包含 CORS headers（浏览器需要）", async () => {
		const { createHttpHandler } = await import("../http-routes");
		const handler = createHttpHandler({
			config: {
				port: 3000,
				authToken: "test-token",
				maxUploadSize: 1024 * 1024,
				corsOrigin: "http://localhost:5173",
			},
			getWebSocketClientCount: () => 0,
		});

		const { res, state } = mockRes();
		await handler(mockReq("/file/test.txt"), res);

		expect(state.statusCode).toBe(401);
		expect(state.headers["Access-Control-Allow-Origin"]).toBe("http://localhost:5173");
	});

	it("CORS headers 在所有路径上均存在（包括 404）", async () => {
		const { createHttpHandler } = await import("../http-routes");
		const handler = createHttpHandler({
			config: {
				port: 3000,
				authToken: "test-token",
				maxUploadSize: 1024 * 1024,
				corsOrigin: "http://localhost:5173",
			},
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
		expect(state.headers["Access-Control-Allow-Origin"]).toBe("http://localhost:5173");
	});
});
