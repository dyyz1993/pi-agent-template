import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "events";

vi.mock("../../shared/register-all-handlers", () => ({
	registerAllHandlers: vi.fn(),
}));

vi.mock("../../shared/lib/logger", () => ({
	createLogger: () => ({
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
	}),
}));

const MOCK_AUTH_TOKEN = "test-secure-token-123456";

function createMockWs() {
	const ws = new EventEmitter();
	(ws as any).readyState = 1;
	(ws as any).close = vi.fn();
	(ws as any).send = vi.fn();
	(ws as any).ping = vi.fn();
	return ws;
}

function createMockReq(url: string, headers: Record<string, string> = {}) {
	return { url, headers };
}

describe("WS Handler Token 安全", () => {
	let wssInstance: EventEmitter & { clients: Set<any> };

	beforeEach(async () => {
		vi.resetModules();

		const { WebSocketServer } = await import("ws");
		const originalWSS = WebSocketServer;

		vi.doMock("ws", () => {
			class MockWSS extends EventEmitter {
				clients = new Set();
				constructor(opts: any) {
					super();
					wssInstance = this;
				}
			}
			return { WebSocketServer: MockWSS, WebSocket: { OPEN: 1 } };
		});
	});

	async function setupTest() {
		const { createWsHandler } = await import("../ws-handler");
		const httpServer = new EventEmitter();
		const wss = createWsHandler(httpServer as any, {
			config: { port: 3100, authToken: MOCK_AUTH_TOKEN, maxUploadSize: 50 * 1024 * 1024 },
		});
		return wss;
	}

	function emitConnection(wss: any, ws: any, req: any) {
		wss.emit("connection", ws, req);
	}

	it("无 token 应被拒绝 (4001)", async () => {
		const wss = await setupTest();
		const ws = createMockWs();
		const req = createMockReq("/ws");
		emitConnection(wss, ws, req);
		expect((ws as any).close).toHaveBeenCalledWith(4001, "Unauthorized");
	});

	it("错误 token 应被拒绝 (4001)", async () => {
		const wss = await setupTest();
		const ws = createMockWs();
		const req = createMockReq("/ws?token=wrong-token");
		emitConnection(wss, ws, req);
		expect((ws as any).close).toHaveBeenCalledWith(4001, "Unauthorized");
	});

	it("正确 token 通过 URL query 应被接受", async () => {
		const wss = await setupTest();
		const ws = createMockWs();
		const req = createMockReq(`/ws?token=${MOCK_AUTH_TOKEN}`);
		emitConnection(wss, ws, req);
		expect((ws as any).close).not.toHaveBeenCalled();
	});

	it("正确 token 通过 Sec-WebSocket-Protocol header 应被接受", async () => {
		const wss = await setupTest();
		const ws = createMockWs();
		const req = createMockReq("/ws", {
			"sec-websocket-protocol": MOCK_AUTH_TOKEN,
		});
		emitConnection(wss, ws, req);
		expect((ws as any).close).not.toHaveBeenCalled();
	});

	it("header 方式优先于 query 方式 (header 正确, query 错误)", async () => {
		const wss = await setupTest();
		const ws = createMockWs();
		const req = createMockReq("/ws?token=wrong-token", {
			"sec-websocket-protocol": MOCK_AUTH_TOKEN,
		});
		emitConnection(wss, ws, req);
		expect((ws as any).close).not.toHaveBeenCalled();
	});

	it("token 验证使用 timingSafeEqual（长度不等返回 false）", async () => {
		const wss = await setupTest();
		const ws = createMockWs();
		const req = createMockReq(`/ws?token=short`);
		emitConnection(wss, ws, req);
		expect((ws as any).close).toHaveBeenCalledWith(4001, "Unauthorized");
	});
});
