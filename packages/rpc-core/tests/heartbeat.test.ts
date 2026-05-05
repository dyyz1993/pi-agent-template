import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { RPCServer } from "../src/server";
import { RPCClient } from "../src/client";
import { InMemoryTransport } from "../src/transports/in-memory";

const TICK = 50;

describe("心跳检测", () => {
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

	test("onDisconnect 触发后服务端清理所有订阅", async () => {
		client.subscribe("timer.tick", () => {});
		await new Promise((r) => setTimeout(r, TICK));

		expect(server.getActiveSubscriptions().length).toBe(1);

		client.close();
		await new Promise((r) => setTimeout(r, TICK));

		expect(server.getActiveSubscriptions().length).toBe(0);
	});

	test("server close 清理所有订阅", async () => {
		client.subscribe("timer.tick", () => {});
		await new Promise((r) => setTimeout(r, TICK));

		expect(server.getActiveSubscriptions().length).toBe(1);

		server.close();

		expect(server.getActiveSubscriptions().length).toBe(0);
	});

	test("InMemoryTransport close 触发 onDisconnect 回调", async () => {
		const pair = InMemoryTransport.createPair();
		const s = new RPCServer(pair.server);
		const c = new RPCClient({ transport: pair.client });

		c.subscribe("timer.tick", () => {});
		await new Promise((r) => setTimeout(r, TICK));

		expect(s.getActiveSubscriptions().length).toBe(1);

		pair.client.close();
		await new Promise((r) => setTimeout(r, TICK));

		expect(s.getActiveSubscriptions().length).toBe(0);
	});
});
