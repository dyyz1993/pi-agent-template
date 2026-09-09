import { describe, it, expect, afterEach } from "vitest";
import http from "http";
import { WebSocket } from "ws";
import {
	createWebServer,
	getLocalIP,
	findAvailablePort,
	type WebServerResult,
} from "../web-server";

function httpGet(url: string): Promise<{ status: number; body: string }> {
	return new Promise((resolve, reject) => {
		http
			.get(url, (res) => {
				let data = "";
				res.on("data", (chunk) => {
					data += chunk;
				});
				res.on("end", () => resolve({ status: res.statusCode ?? 0, body: data }));
			})
			.on("error", reject);
	});
}

describe("createWebServer 工厂函数", () => {
	let webServer: WebServerResult | null = null;

	afterEach(async () => {
		if (webServer) {
			await webServer.close();
			webServer = null;
		}
	});

	it("应返回 httpServer + wss + port + authToken", async () => {
		webServer = await createWebServer({
			port: 0,
			authToken: "test-token-001",
			maxUploadSize: 1024,
			corsOrigin: "*",
		});

		expect(webServer.httpServer).toBeDefined();
		expect(webServer.wss).toBeDefined();
		expect(webServer.port).toBeGreaterThan(0);
		expect(webServer.authToken).toBe("test-token-001");
		expect(typeof webServer.close).toBe("function");
	});

	it("应启动 HTTP 服务并监听指定端口", async () => {
		const testServer = http.createServer();
		const port = await new Promise<number>((resolve) => {
			testServer.listen(0, () => {
				const addr = testServer.address();
				resolve(typeof addr === "object" && addr ? addr.port : 3100);
			});
		});
		await new Promise<void>((resolve) => testServer.close(() => resolve()));

		webServer = await createWebServer({
			port,
			authToken: "test-token-002",
			maxUploadSize: 1024,
			corsOrigin: "*",
		});

		expect(webServer.port).toBe(port);

		const { status, body } = await httpGet(`http://localhost:${webServer.port}/health`);
		expect(status).toBe(200);
		const json = JSON.parse(body);
		expect(json.status).toBe("ok");
	});

	it("端口冲突时应自动递增到可用端口", async () => {
		const blocker = http.createServer();
		const blockerPort = await new Promise<number>((resolve) => {
			blocker.listen(0, () => {
				const addr = blocker.address();
				resolve(typeof addr === "object" && addr ? addr.port : 3100);
			});
		});

		webServer = await createWebServer({
			port: blockerPort,
			authToken: "test-token-003",
			maxUploadSize: 1024,
			corsOrigin: "*",
		});

		expect(webServer.port).not.toBe(blockerPort);
		expect(webServer.port).toBeGreaterThan(blockerPort);

		await new Promise<void>((resolve) => blocker.close(() => resolve()));
	});

	it("WS 客户端应能通过 token 连接", async () => {
		webServer = await createWebServer({
			port: 0,
			authToken: "test-token-004",
			maxUploadSize: 1024,
			corsOrigin: "*",
		});

		const ws = new WebSocket(`ws://localhost:${webServer.port}/ws?token=${webServer.authToken}`);

		await new Promise<void>((resolve, reject) => {
			ws.on("open", () => {
				ws.close();
				resolve();
			});
			ws.on("error", reject);
		});
	});

	it("无 token 的 WS 连接应被拒绝", async () => {
		webServer = await createWebServer({
			port: 0,
			authToken: "test-token-005",
			maxUploadSize: 1024,
			corsOrigin: "*",
		});

		const ws = new WebSocket(`ws://localhost:${webServer.port}/ws`);

		const closeCode = await new Promise<number>((resolve) => {
			ws.on("close", (code) => resolve(code));
			ws.on("error", () => {});
		});
		expect(closeCode).toBe(4001);
	});

	it("HTTP 请求需要 token 才能访问文件路由", async () => {
		webServer = await createWebServer({
			port: 0,
			authToken: "test-token-006",
			maxUploadSize: 1024,
			corsOrigin: "*",
		});

		const { status } = await httpGet(`http://localhost:${webServer.port}/info/some/path`);
		expect(status).toBe(401);
	});

	it("health 端点不需要 token", async () => {
		webServer = await createWebServer({
			port: 0,
			authToken: "test-token-007",
			maxUploadSize: 1024,
			corsOrigin: "*",
		});

		const { status, body } = await httpGet(`http://localhost:${webServer.port}/health`);
		expect(status).toBe(200);
		const json = JSON.parse(body);
		expect(json).toHaveProperty("status", "ok");
		expect(json).toHaveProperty("clients");
	});

	it("关闭 webServer 应停止 HTTP 和 WS 服务", async () => {
		webServer = await createWebServer({
			port: 0,
			authToken: "test-token-008",
			maxUploadSize: 1024,
			corsOrigin: "*",
		});

		const port = webServer.port;
		await webServer.close();
		webServer = null;

		await expect(httpGet(`http://localhost:${port}/health`)).rejects.toThrow();
	});
});

describe("getLocalIP", () => {
	it("应返回非空字符串", () => {
		const ip = getLocalIP();
		expect(typeof ip).toBe("string");
		expect(ip.length).toBeGreaterThan(0);
		expect(ip).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
	});
});

describe("findAvailablePort", () => {
	it("应返回一个可用端口", async () => {
		const port = await findAvailablePort(40000);
		expect(port).toBeGreaterThanOrEqual(40000);
	});
});
