import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolve } from "path";

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

const CWD = resolve(process.cwd());
const config = {
	port: 3000,
	authToken: "test-token",
	maxUploadSize: 1024 * 1024 * 10,
	corsOrigin: "*",
};

describe("文件路径安全", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("不允许访问项目根目录以外的文件（路径穿越 ../ 阻断）", async () => {
		const { createHttpHandler } = await import("../http-routes");
		const handler = createHttpHandler({
			config,
			getWebSocketClientCount: () => 0,
		});

		const traversalPaths = [
			`/file/${encodeURIComponent(CWD + "/../../../etc/passwd")}`,
			`/file/${encodeURIComponent("../../../etc/passwd")}`,
			`/file/${encodeURIComponent(CWD + "/../../tmp/evil")}`,
		];

		for (const path of traversalPaths) {
			const { res, state } = mockRes();
			await handler(
				mockReq(path, {
					headers: { authorization: "Bearer test-token" },
				}),
				res
			);
			expect(state.statusCode, `Expected 403 for path: ${path}`).toBe(403);
			expect(JSON.parse(state.body).error).toBe("Path not allowed");
		}
	});

	it("不允许访问绝对路径 /etc/passwd", async () => {
		const { createHttpHandler } = await import("../http-routes");
		const handler = createHttpHandler({
			config,
			getWebSocketClientCount: () => 0,
		});

		const { res, state } = mockRes();
		await handler(
			mockReq(`/file/${encodeURIComponent("/etc/passwd")}`, {
				headers: { authorization: "Bearer test-token" },
			}),
			res
		);

		expect(state.statusCode).toBe(403);
	});

	it("不允许访问系统目录 /tmp", async () => {
		const { createHttpHandler } = await import("../http-routes");
		const handler = createHttpHandler({
			config,
			getWebSocketClientCount: () => 0,
		});

		const { res, state } = mockRes();
		await handler(
			mockReq(`/file/${encodeURIComponent("/tmp/evil-file")}`, {
				headers: { authorization: "Bearer test-token" },
			}),
			res
		);

		expect(state.statusCode).toBe(403);
	});

	it("/info 端点同样阻止路径穿越", async () => {
		const { createHttpHandler } = await import("../http-routes");
		const handler = createHttpHandler({
			config,
			getWebSocketClientCount: () => 0,
		});

		const { res, state } = mockRes();
		await handler(
			mockReq(`/info/${encodeURIComponent("/etc/passwd")}`, {
				headers: { authorization: "Bearer test-token" },
			}),
			res
		);

		expect(state.statusCode).toBe(403);
	});

	it("URL 编码绕过 %2e%2e%2f 被阻断", async () => {
		const { createHttpHandler } = await import("../http-routes");
		const handler = createHttpHandler({
			config,
			getWebSocketClientCount: () => 0,
		});

		const doubleEncodedPath = "%252e%252e%252f" + "etc%252fpasswd";

		const { res, state } = mockRes();
		await handler(
			mockReq(`/file/${doubleEncodedPath}`, {
				headers: { authorization: "Bearer test-token" },
			}),
			res
		);

		const isBlocked = state.statusCode === 403 || state.statusCode === 404;
		expect(isBlocked, `Expected 403 or 404, got ${state.statusCode}`).toBe(true);
	});

	it("允许访问项目根目录内的文件", async () => {
		const { createHttpHandler } = await import("../http-routes");
		const handler = createHttpHandler({
			config,
			getWebSocketClientCount: () => 0,
		});

		const { res, state } = mockRes();
		await handler(
			mockReq(`/file/${encodeURIComponent(CWD + "/package.json")}`, {
				headers: { authorization: "Bearer test-token" },
			}),
			res
		);

		expect(state.statusCode).not.toBe(403);
	});

	it("允许访问子目录内的文件", async () => {
		const { createHttpHandler } = await import("../http-routes");
		const handler = createHttpHandler({
			config,
			getWebSocketClientCount: () => 0,
		});

		const { res, state } = mockRes();
		await handler(
			mockReq(`/file/${encodeURIComponent(CWD + "/src/some-file.txt")}`, {
				headers: { authorization: "Bearer test-token" },
			}),
			res
		);

		expect(state.statusCode).not.toBe(403);
	});

	it("上传文件路径也受 ALLOWED_ROOTS 限制", async () => {
		const { createHttpHandler } = await import("../http-routes");
		const handler = createHttpHandler({
			config,
			getWebSocketClientCount: () => 0,
		});

		const { res, state } = mockRes();
		await handler(
			mockReq(`/file/upload?path=${encodeURIComponent("/tmp/evil-upload.txt")}`, {
				method: "POST",
				headers: { authorization: "Bearer test-token" },
			}),
			res
		);

		expect(state.statusCode).toBe(403);
		expect(JSON.parse(state.body).error).toBe("Path not allowed");
	});

	it("上传文件到项目目录内被允许（不会 403）", async () => {
		const { createHttpHandler } = await import("../http-routes");
		const handler = createHttpHandler({
			config,
			getWebSocketClientCount: () => 0,
		});

		const { res, state } = mockRes();
		await handler(
			mockReq(`/file/upload?path=${encodeURIComponent(CWD + "/test-upload.txt")}`, {
				method: "POST",
				headers: { authorization: "Bearer test-token" },
			}),
			res
		);

		expect(state.statusCode).not.toBe(403);
	});

	it("空路径被拒绝", async () => {
		const { createHttpHandler } = await import("../http-routes");
		const handler = createHttpHandler({
			config,
			getWebSocketClientCount: () => 0,
		});

		const { res, state } = mockRes();
		await handler(
			mockReq(`/file/`, {
				headers: { authorization: "Bearer test-token" },
			}),
			res
		);

		expect([403, 404, 500].includes(state.statusCode)).toBe(true);
	});

	it("Windows 风格反斜杠路径被正确处理", async () => {
		const { createHttpHandler } = await import("../http-routes");
		const handler = createHttpHandler({
			config,
			getWebSocketClientCount: () => 0,
		});

		const { res, state } = mockRes();
		await handler(
			mockReq(`/file/${encodeURIComponent("..\\..\\etc\\passwd")}`, {
				headers: { authorization: "Bearer test-token" },
			}),
			res
		);

		expect([403, 404].includes(state.statusCode)).toBe(true);
	});
});
