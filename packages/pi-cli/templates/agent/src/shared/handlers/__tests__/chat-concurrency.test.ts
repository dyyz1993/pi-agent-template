import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { join } from "path";
import { homedir } from "os";
import { unlink } from "fs/promises";
import { existsSync } from "fs";

vi.mock("../../lib/logger", () => ({
	createLogger: () => ({
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
	}),
}));

function createMockServer() {
	const handlers = new Map<string, (params: unknown) => Promise<unknown>>();
	return {
		register: vi.fn((method: string, handler: (params: unknown) => Promise<unknown>) => {
			handlers.set(method, handler);
		}),
		emitEvent: vi.fn(),
		handlers,
		async call(method: string, params: unknown) {
			const h = handlers.get(method);
			if (!h) throw new Error(`No handler for ${method}`);
			return h(params);
		},
	};
}

const DESKTOP_HISTORY_PATH = join(homedir(), ".pi-agent", "chat-history-desktop.json");

describe("Chat Handler 并发安全", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	afterEach(async () => {
		if (existsSync(DESKTOP_HISTORY_PATH)) {
			await unlink(DESKTOP_HISTORY_PATH).catch(() => {});
		}
	});

	it("两个独立的 RPCServer 应注册各自的 handler", async () => {
		const { register } = await import("../chat");
		const serverA = createMockServer();
		const serverB = createMockServer();

		register(serverA as any, { platform: "desktop" });
		register(serverB as any, { platform: "web" });

		expect(serverA.register).toHaveBeenCalledWith("chat.list", expect.any(Function));
		expect(serverA.register).toHaveBeenCalledWith("chat.send", expect.any(Function));
		expect(serverB.register).toHaveBeenCalledWith("chat.list", expect.any(Function));
		expect(serverB.register).toHaveBeenCalledWith("chat.send", expect.any(Function));
	});

	it("server A 的消息不影响 server B 的消息列表", async () => {
		const { register } = await import("../chat");
		const serverA = createMockServer();
		const serverB = createMockServer();

		register(serverA as any, { platform: "desktop" });
		register(serverB as any, { platform: "web" });

		await serverA.call("chat.send", { content: "hello from desktop" });
		await serverB.call("chat.send", { content: "hello from web" });

		const resultA = (await serverA.call("chat.list", { limit: 50 })) as {
			messages: { content: string }[];
		};
		const resultB = (await serverB.call("chat.list", { limit: 50 })) as {
			messages: { content: string }[];
		};

		const desktopContents = resultA.messages.map((m) => m.content);
		const webContents = resultB.messages.map((m) => m.content);

		expect(desktopContents).toContain("hello from desktop");
		expect(webContents).toContain("hello from web");
		expect(desktopContents).not.toContain("hello from web");
		expect(webContents).not.toContain("hello from desktop");
	});

	it("同一 server 内的消息按顺序写入", async () => {
		const { register } = await import("../chat");
		const server = createMockServer();
		register(server as any, { platform: "desktop" });

		await server.call("chat.send", { content: "msg1" });
		await server.call("chat.send", { content: "msg2" });
		await server.call("chat.send", { content: "msg3" });

		const result = (await server.call("chat.list", { limit: 50 })) as {
			messages: { role: string; content: string }[];
		};

		const userMsgs = result.messages.filter((m) => m.role === "user").map((m) => m.content);
		expect(userMsgs).toEqual(["msg1", "msg2", "msg3"]);
	});

	it("存储路径应包含平台标识（desktop/web）或唯一 ID", async () => {
		const { getStoragePathFor } = await import("../chat");
		const desktopPath = getStoragePathFor("desktop");
		const webPath = getStoragePathFor("web");

		expect(desktopPath).toContain("desktop");
		expect(webPath).not.toBe(desktopPath);
		expect(webPath).toMatch(/web/);
	});

	it("desktop 使用固定路径保留历史", async () => {
		const { getStoragePathFor } = await import("../chat");
		const path1 = getStoragePathFor("desktop");
		const path2 = getStoragePathFor("desktop");
		expect(path1).toBe(path2);
		expect(path1).toContain("chat-history-desktop.json");
	});

	it("web 每次生成不同的路径", async () => {
		const { getStoragePathFor } = await import("../chat");
		const path1 = getStoragePathFor("web");
		const path2 = getStoragePathFor("web");
		expect(path1).not.toBe(path2);
	});
});
