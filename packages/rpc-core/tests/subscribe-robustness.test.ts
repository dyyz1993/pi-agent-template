import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { RPCServer } from "../src/server";
import { RPCClient } from "../src/client";
import { InMemoryTransport } from "../src/transports/in-memory";

const TICK = 50;

describe("订阅健壮性", () => {
	let server: RPCServer;
	let client: RPCClient;
	let warnLogs: Array<{ message: string; args: unknown[] }>;

	beforeEach(() => {
		warnLogs = [];
		const pair = InMemoryTransport.createPair();
		server = new RPCServer(pair.server, {
			logger: {
				debug: () => {},
				info: () => {},
				warn: (message: string, ...args: unknown[]) => {
					warnLogs.push({ message, args });
				},
				error: () => {},
			},
		});
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

	test("emitEvent 时无匹配订阅应记录 warn 日志", async () => {
		await server.emitEvent("timer.tick", { count: 1 });

		expect(warnLogs.length).toBeGreaterThanOrEqual(1);
		const lastWarn = warnLogs[warnLogs.length - 1];
		expect(lastWarn.message).toContain("timer.tick");
	});

	test("emitEvent 时有匹配订阅不应记录 warn", async () => {
		client.subscribe("timer.tick", () => {});
		await new Promise((r) => setTimeout(r, TICK));

		await server.emitEvent("timer.tick", { count: 1 });

		const noMatchWarns = warnLogs.filter((w) => w.message.includes("No matching"));
		expect(noMatchWarns.length).toBe(0);
	});

	test("filter 字段名不匹配时应记录 warn（含期望 keys 和实际 keys）", async () => {
		client.subscribe("chat.message", () => {}, { Role: "assistant" });
		await new Promise((r) => setTimeout(r, TICK));

		await server.emitEvent("chat.message", { text: "hi" }, { role: "assistant" });

		const warn = warnLogs.find(
			(w) => w.message.includes("No matching") || w.message.includes("chat.message")
		);
		expect(warn).toBeDefined();
		const args = warn!.args[0] as Record<string, unknown> | undefined;
		expect(args).toBeDefined();
		expect(args!.metadataKeys).toContain("role");
		expect(args!.filterKeys).toContain("Role");
	});

	test("emitEvent 时 eventType 无任何订阅应记录 warn（含活跃 eventType 列表）", async () => {
		client.subscribe("timer.tick", () => {});
		await new Promise((r) => setTimeout(r, TICK));

		await server.emitEvent("chat.message", { text: "hello" });

		const warn = warnLogs.find(
			(w) => w.message.includes("No matching") || w.message.includes("chat.message")
		);
		expect(warn).toBeDefined();
		const args = warn!.args[0] as Record<string, unknown> | undefined;
		expect(args).toBeDefined();
		const activeTypes = args!.activeEventTypes as string[];
		expect(activeTypes).toContain("timer.tick");
	});
});

describe("debug.subscriptions", () => {
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

	test("getActiveSubscriptions 返回当前所有活跃订阅", async () => {
		client.subscribe("timer.tick", () => {});
		client.subscribe("chat.message", () => {});
		await new Promise((r) => setTimeout(r, TICK));

		const subs = server.getActiveSubscriptions();
		expect(subs.length).toBe(2);

		const types = subs.map((s) => s.eventType).sort();
		expect(types).toEqual(["chat.message", "timer.tick"]);

		for (const sub of subs) {
			expect(sub.id).toBeTruthy();
			expect(sub.eventType).toBeTruthy();
			expect(sub.filter).toBeDefined();
		}
	});

	test("unsubscribe 后 getActiveSubscriptions 不包含该订阅", async () => {
		const subId = client.subscribe("timer.tick", () => {});
		await new Promise((r) => setTimeout(r, TICK));

		client.unsubscribe(subId);
		await new Promise((r) => setTimeout(r, TICK));

		const subs = server.getActiveSubscriptions();
		expect(subs.length).toBe(0);
	});

	test("连接断开后 getActiveSubscriptions 返回空数组", async () => {
		client.subscribe("timer.tick", () => {});
		await new Promise((r) => setTimeout(r, TICK));

		expect(server.getActiveSubscriptions().length).toBe(1);

		client.close();
		await new Promise((r) => setTimeout(r, TICK));

		expect(server.getActiveSubscriptions().length).toBe(0);
	});

	test("重复 subscribe 相同 eventType + filter 只产生一个订阅", async () => {
		client.subscribe("timer.tick", () => {});
		client.subscribe("timer.tick", () => {});
		await new Promise((r) => setTimeout(r, TICK));

		const subs = server.getActiveSubscriptions();
		expect(subs.length).toBe(1);
	});

	test("不同 filter 的相同 eventType 产生独立订阅", async () => {
		client.subscribe("chat.message", () => {}, { role: "user" });
		client.subscribe("chat.message", () => {}, { role: "assistant" });
		await new Promise((r) => setTimeout(r, TICK));

		const subs = server.getActiveSubscriptions();
		expect(subs.length).toBe(2);

		const filters = subs.map((s) => s.filter);
		expect(filters).toContainEqual({ role: "user" });
		expect(filters).toContainEqual({ role: "assistant" });
	});
});
