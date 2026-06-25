import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Server Config 安全策略", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		vi.resetModules();
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("生产环境未设 AUTH_TOKEN 应抛出致命错误", async () => {
		process.env.NODE_ENV = "production";
		delete process.env.AUTH_TOKEN;
		await expect(import("../server-config")).rejects.toThrow(/AUTH_TOKEN/);
	});

	it("开发环境未设 AUTH_TOKEN 应自动生成随机 token", async () => {
		process.env.NODE_ENV = "development";
		delete process.env.AUTH_TOKEN;
		const mod = await import("../server-config");
		expect(mod.config.authToken).toBeTruthy();
		expect(mod.config.authToken).not.toBe("pi-agent-template-token");
		expect(mod.config.authToken.length).toBeGreaterThan(20);
	});

	it("显式设置 AUTH_TOKEN 应使用用户提供的值", async () => {
		delete process.env.NODE_ENV;
		process.env.AUTH_TOKEN = "my-custom-token-12345";
		const mod = await import("../server-config");
		expect(mod.config.authToken).toBe("my-custom-token-12345");
	});

	it("自动生成的 token 每次不同", async () => {
		process.env.NODE_ENV = "development";
		delete process.env.AUTH_TOKEN;
		vi.resetModules();
		const mod1 = await import("../server-config");
		const token1 = mod1.config.authToken;
		vi.resetModules();
		const mod2 = await import("../server-config");
		const token2 = mod2.config.authToken;
		expect(token1).not.toBe(token2);
	});

	it("生产环境设了 AUTH_TOKEN 不应抛错", async () => {
		process.env.NODE_ENV = "production";
		process.env.AUTH_TOKEN = "production-secure-token";
		const mod = await import("../server-config");
		expect(mod.config.authToken).toBe("production-secure-token");
	});
});
