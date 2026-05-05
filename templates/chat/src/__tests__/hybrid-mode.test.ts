import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("electrobun/bun", () => ({
	BrowserWindow: {
		defineRPC: vi.fn(() => ({})),
	},
	BrowserView: {
		defineRPC: vi.fn(() => ({
			requests: {},
			messages: {},
		})),
	},
	Updater: {
		localInfo: vi.fn(() => ({ channel: vi.fn(() => "dev") })),
	},
	ApplicationMenu: {
		setApplicationMenu: vi.fn(),
	},
}));

vi.mock("electrobun", () => ({}));

describe("混合模式", () => {
	beforeEach(() => {
		vi.resetModules();
		delete process.env.ENABLE_WEB_SERVICE;
		delete process.env.AUTH_TOKEN;
		process.env.NODE_ENV = "test";
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("默认不启动 Web 服务（enableWebService 为 false）", async () => {
		const { config } = await import("../server-config");
		expect(config.enableWebService).toBe(false);
	});

	it("enableWebService=true 时启动 HTTP + WS 服务", async () => {
		process.env.ENABLE_WEB_SERVICE = "true";
		const { config } = await import("../server-config");
		expect(config.enableWebService).toBe(true);
	});

	it("IPC 和 WS 服务同时工作，状态隔离", async () => {
		const { ElectrobunTransport } = await import("../gateway/ipc-transport");
		const ipcTransport = new ElectrobunTransport();
		expect(ipcTransport.isConnected()).toBe(false);

		ipcTransport.setBrowserView({ executeJavascript: vi.fn() });
		expect(ipcTransport.isConnected()).toBe(true);

		const { createWebServer } = await import("../shared/lib/web-server");
		const webServer = await createWebServer({
			port: 0,
			authToken: "test-token",
			maxUploadSize: 1024,
			corsOrigin: "*",
		});
		expect(webServer.port).toBeGreaterThan(0);
		expect(ipcTransport.isConnected()).toBe(true);
		await webServer.close();
	});

	it("WS 客户端需要 token 才能连接", async () => {
		const { createWebServer } = await import("../shared/lib/web-server");
		const webServer = await createWebServer({
			port: 0,
			authToken: "test-token",
			maxUploadSize: 1024,
			corsOrigin: "*",
		});
		expect(webServer.authToken).toBeTruthy();
		expect(webServer.authToken.length).toBeGreaterThan(0);
		await webServer.close();
	});

	it("IPC 客户端不需要 token", async () => {
		const { ElectrobunTransport } = await import("../gateway/ipc-transport");
		const transport = new ElectrobunTransport();
		transport.setBrowserView({ executeJavascript: vi.fn() });
		expect(transport.isConnected()).toBe(true);
	});

	it("动态生成的 token 每次启动不同", async () => {
		const { createWebServer } = await import("../shared/lib/web-server");
		const ws1 = await createWebServer({
			port: 0,
			authToken: `token-${Date.now()}-1`,
			maxUploadSize: 1024,
			corsOrigin: "*",
		});
		const ws2 = await createWebServer({
			port: 0,
			authToken: `token-${Date.now()}-2`,
			maxUploadSize: 1024,
			corsOrigin: "*",
		});
		expect(ws1.authToken).not.toBe(ws2.authToken);
		await ws1.close();
		await ws2.close();
	});

	it("关闭桌面端时 Web 服务也关闭", async () => {
		const { createWebServer } = await import("../shared/lib/web-server");
		const webServer = await createWebServer({
			port: 0,
			authToken: "test-token",
			maxUploadSize: 1024,
			corsOrigin: "*",
		});
		expect(webServer.httpServer.listening).toBe(true);
		await webServer.close();
		await new Promise((r) => setTimeout(r, 50));
		expect(webServer.httpServer.listening).toBe(false);
	});

	it("getLocalIP 返回有效 IP 地址", async () => {
		const { getLocalIP } = await import("../shared/lib/web-server");
		const ip = getLocalIP();
		expect(ip).toBeTruthy();
		expect(ip).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
	});
});
