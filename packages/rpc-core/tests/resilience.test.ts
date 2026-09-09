import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { RPCServer } from "../src/server";
import { RPCClient, RPCServerError, RPCDisconnectError } from "../src/client";
import { InMemoryTransport } from "../src/transports/in-memory";
import { IPCTransport } from "../src/transports/ipc";
import { SSETransport } from "../src/transports/sse";
import { WebSocketTransport } from "../src/transports/websocket";

const TICK = 50;

describe("订阅多播与引用计数", () => {
	let server: RPCServer;
	let client: RPCClient;

	beforeEach(() => {
		const pair = InMemoryTransport.createPair();
		server = new RPCServer(pair.server);
		client = new RPCClient({ transport: pair.client });
	});

	afterEach(() => {
		try {
			client.close();
		} catch {
			/* noop */
		}
		try {
			server.close();
		} catch {
			/* noop */
		}
	});

	test("同 key 的两个订阅都能收到事件", async () => {
		const receivedA: unknown[] = [];
		const receivedB: unknown[] = [];
		client.subscribe("chat.delta", (e) => receivedA.push(e.payload));
		client.subscribe("chat.delta", (e) => receivedB.push(e.payload));
		await new Promise((r) => setTimeout(r, TICK));

		await server.emitEvent("chat.delta", { n: 1 });
		await new Promise((r) => setTimeout(r, TICK));

		expect(receivedA.length).toBe(1);
		expect(receivedB.length).toBe(1);
	});

	test("服务端只保留一份订阅，最后一个本地订阅退出才真正退订", async () => {
		const received: unknown[] = [];
		const idA = client.subscribe("chat.delta", () => {});
		const idB = client.subscribe("chat.delta", (e) => received.push(e.payload));
		await new Promise((r) => setTimeout(r, TICK));

		expect(server.getActiveSubscriptions().length).toBe(1);

		client.unsubscribe(idA);
		await new Promise((r) => setTimeout(r, TICK));
		// B 仍然在订阅，服务端订阅保留
		expect(server.getActiveSubscriptions().length).toBe(1);
		await server.emitEvent("chat.delta", { n: 1 });
		await new Promise((r) => setTimeout(r, TICK));
		expect(received.length).toBe(1);

		client.unsubscribe(idB);
		await new Promise((r) => setTimeout(r, TICK));
		expect(server.getActiveSubscriptions().length).toBe(0);
	});

	test("同 key 订阅 id 互不相同", () => {
		const idA = client.subscribe("chat.delta", () => {});
		const idB = client.subscribe("chat.delta", () => {});
		expect(idA).not.toBe(idB);
	});
});

describe("断连 fail-fast", () => {
	test("断连时挂起的请求立刻以 RPCDisconnectError 失败", async () => {
		const pair = InMemoryTransport.createPair();
		const server = new RPCServer(pair.server);
		const client = new RPCClient({ transport: pair.client, timeout: 5000 });

		server.register("slow", async () => {
			await new Promise((r) => setTimeout(r, 1000));
			return "done";
		});

		const startedAt = Date.now();
		const pending = client.call<string>("slow");
		await new Promise((r) => setTimeout(r, TICK));

		pair.client.close();

		let error: unknown;
		try {
			await pending;
		} catch (e) {
			error = e;
		}
		const elapsed = Date.now() - startedAt;

		expect(error).toBeInstanceOf(RPCDisconnectError);
		expect(elapsed).toBeLessThan(900);

		server.close();
	});
});

describe("服务端错误码", () => {
	test("方法不存在时错误携带 code 404", async () => {
		const pair = InMemoryTransport.createPair();
		const server = new RPCServer(pair.server);
		const client = new RPCClient({ transport: pair.client });

		let error: unknown;
		try {
			await client.call("nope.method");
		} catch (e) {
			error = e;
		}

		expect(error).toBeInstanceOf(RPCServerError);
		expect((error as RPCServerError).code).toBe(404);
		expect((error as RPCServerError).message).toContain("nope.method");

		client.close();
		server.close();
	});

	test("handler 抛错时错误携带 code 500", async () => {
		const pair = InMemoryTransport.createPair();
		const server = new RPCServer(pair.server);
		const client = new RPCClient({ transport: pair.client });

		server.register("boom.method", async () => {
			throw new Error("kaboom");
		});

		let error: unknown;
		try {
			await client.call("boom.method");
		} catch (e) {
			error = e;
		}

		expect(error).toBeInstanceOf(RPCServerError);
		expect((error as RPCServerError).code).toBe(500);
		expect((error as RPCServerError).message).toBe("kaboom");

		client.close();
		server.close();
	});
});

describe("重连自动重订阅", () => {
	test("SSE 重连后无需手动重订阅即可继续收到事件", async () => {
		const pair = await SSETransport.createPair();
		const server = new RPCServer(pair.server);
		const client = new RPCClient({ transport: pair.client });

		const events: unknown[] = [];
		client.subscribe("status.change", (e) => events.push(e.payload));
		await new Promise((r) => setTimeout(r, TICK));

		await server.emitEvent("status.change", { v: 1 });
		await new Promise((r) => setTimeout(r, TICK));
		expect(events.length).toBe(1);

		pair.server.simulateDisconnect(pair.client);
		await new Promise((r) => setTimeout(r, TICK));
		expect(server.getActiveSubscriptions().length).toBe(0);

		// 不做任何手动 unsubscribe/subscribe，直接重连
		await pair.server.simulateReconnect(pair.client);
		await new Promise((r) => setTimeout(r, TICK));

		await server.emitEvent("status.change", { v: 2 });
		await new Promise((r) => setTimeout(r, TICK));
		expect(events.length).toBe(2);
		expect(events[1]).toEqual({ v: 2 });

		client.close();
		server.close();
	});
});

describe("IPC 断连语义", () => {
	test("client 侧 close 会让服务端感知并清理订阅", async () => {
		const pair = IPCTransport.createPair();
		const server = new RPCServer(pair.server);
		const client = new RPCClient({ transport: pair.client });

		client.subscribe("ipc.event", () => {});
		await new Promise((r) => setTimeout(r, TICK));
		expect(server.getActiveSubscriptions().length).toBe(1);

		client.close();
		await new Promise((r) => setTimeout(r, TICK));
		expect(server.getActiveSubscriptions().length).toBe(0);

		server.close();
	});
});

describe("真实连接失败下的重连收敛", () => {
	test("连接持续失败时 close() 后连接不会复活", async () => {
		const transport = new WebSocketTransport({
			url: "ws://127.0.0.1:1", // 端口 1 几乎必然 connection refused
			reconnect: true,
			reconnectInterval: 30,
			maxReconnectAttempts: 50,
		});

		await transport.connect().catch(() => {});
		// 经历若干次失败重连，制造出旧实现下会泄漏的孤儿 timer
		await new Promise((r) => setTimeout(r, 120));

		transport.close();
		await new Promise((r) => setTimeout(r, 250));

		expect((transport as unknown as { ws: unknown }).ws).toBeNull();
		expect(transport.isConnected()).toBe(false);
	});

	test("连接持续失败时重连调度不会翻倍", async () => {
		let scheduleCount = 0;
		const transport = new WebSocketTransport({
			url: "ws://127.0.0.1:1",
			reconnect: true,
			reconnectInterval: 30,
			maxReconnectAttempts: 50,
		});
		const original = (transport as unknown as { scheduleReconnect: () => void }).scheduleReconnect;
		(transport as unknown as { scheduleReconnect: () => void }).scheduleReconnect =
			function patched(this: WebSocketTransport) {
				scheduleCount++;
				original.call(this);
			};

		await transport.connect().catch(() => {});
		await new Promise((r) => setTimeout(r, 200));

		transport.close();
		// 每个失败周期只应调度一次；旧实现里 onerror/onclose 双路径会成倍增加
		expect(scheduleCount).toBeLessThanOrEqual(8);

		await new Promise((r) => setTimeout(r, 100));
		const afterClose = scheduleCount;
		await new Promise((r) => setTimeout(r, 100));
		expect(scheduleCount).toBe(afterClose);
	});
});
