import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { RPCServer } from "@dyyz1993/rpc-core";

vi.mock("../../lib/logger", () => ({
	createLogger: () => ({
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
	}),
}));

function createMockServer() {
	const handlers: Record<string, Function> = {};
	return {
		handlers,
		server: {
			register: vi.fn((method: string, handler: Function) => {
				handlers[method] = handler;
			}),
			emitEvent: vi.fn(),
		} as unknown as RPCServer,
	};
}

// --- Timer ---
describe("Handler 隔离性 - timer", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.resetModules();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("两个独立的 RPCServer 各自维护独立的定时器状态", async () => {
		const a = createMockServer();
		const b = createMockServer();

		const { register } = await import("../timer");
		register(a.server, { platform: "web" });
		register(b.server, { platform: "web" });

		const resultA = await a.handlers["timer.start"]({});
		expect(resultA).toEqual({ started: true });

		const resultB = await b.handlers["timer.start"]({});
		expect(resultB).toEqual({ started: true });

		await a.handlers["timer.stop"]({});
		const resultB2 = await b.handlers["timer.start"]({});
		expect(resultB2).toEqual({ alreadyRunning: true });
	});

	it("server A 停止定时器不影响 server B 的定时器", async () => {
		const a = createMockServer();
		const b = createMockServer();

		const { register } = await import("../timer");
		register(a.server, { platform: "web" });
		register(b.server, { platform: "web" });

		await a.handlers["timer.start"]({});
		await b.handlers["timer.start"]({});

		await a.handlers["timer.stop"]({});

		vi.advanceTimersByTime(2000);
		expect(b.server.emitEvent).toHaveBeenCalled();
	});
});

// --- Bash ---
describe("Handler 隔离性 - bash", () => {
	beforeEach(() => {
		vi.resetModules();
		vi.stubGlobal("Bun", { spawn: vi.fn() });
		vi.stubGlobal(
			"Response",
			class {
				private src: any;
				constructor(src: any) {
					this.src = src;
				}
				async text() {
					if (this.src && typeof this.src.text === "function") return this.src.text();
					return String(this.src);
				}
			}
		);
	});

	it("两个独立的 RPCServer 各自维护独立的进程列表", async () => {
		const a = createMockServer();
		const b = createMockServer();

		const { register } = await import("../bash");
		register(a.server, { platform: "web" });
		register(b.server, { platform: "web" });

		const mockSub = {
			pid: 100,
			stdout: { text: () => Promise.resolve("ok") },
			stderr: { text: () => Promise.resolve("") },
			exited: Promise.resolve(0),
		};
		(Bun.spawn as ReturnType<typeof vi.fn>).mockReturnValue(mockSub);

		const resultA = await a.handlers["bash.execute"]({ command: "echo A" });
		const resultB = await b.handlers["bash.execute"]({ command: "echo B" });

		expect(resultA.pid).toBe(1);
		expect(resultB.pid).toBe(1);
	});

	it("server A 的 pidCounter 不影响 server B", async () => {
		const a = createMockServer();
		const b = createMockServer();

		const { register } = await import("../bash");
		register(a.server, { platform: "web" });
		register(b.server, { platform: "web" });

		const mockSub = {
			pid: 100,
			stdout: { text: () => Promise.resolve("ok") },
			stderr: { text: () => Promise.resolve("") },
			exited: Promise.resolve(0),
		};
		(Bun.spawn as ReturnType<typeof vi.fn>).mockReturnValue(mockSub);

		await a.handlers["bash.execute"]({ command: "ls" });
		await a.handlers["bash.execute"]({ command: "ls" });
		await a.handlers["bash.execute"]({ command: "ls" });

		const resultB = await b.handlers["bash.execute"]({ command: "ls" });
		expect(resultB.pid).toBe(1);
	});
});

// --- Feed ---
describe("Handler 隔离性 - feed", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it("两个独立的 RPCServer 各自维护独立的帖子列表", async () => {
		const a = createMockServer();
		const b = createMockServer();

		const { register } = await import("../feed");
		register(a.server, { platform: "web" });
		register(b.server, { platform: "web" });

		await a.handlers["feed.post"]({ content: "post from A", category: "tech" });

		const listB = await b.handlers["feed.list"]({});
		expect(listB.posts).toHaveLength(0);

		const listA = await a.handlers["feed.list"]({});
		expect(listA.posts).toHaveLength(1);
		expect(listA.posts[0].content).toBe("post from A");
	});
});

// --- Todo ---
describe("Handler 隔离性 - todo", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it("两个独立的 RPCServer 各自维护独立的 todo 列表", async () => {
		const a = createMockServer();
		const b = createMockServer();

		const { register } = await import("../todo");
		register(a.server, { platform: "web" });
		register(b.server, { platform: "web" });

		await a.handlers["todo.add"]({ content: "task from A" });

		const listB = await b.handlers["todo.list"]({});
		expect(listB.items).toHaveLength(0);

		const listA = await a.handlers["todo.list"]({});
		expect(listA.items).toHaveLength(1);
	});

	it("server A 的 todoIdCounter 不影响 server B", async () => {
		const a = createMockServer();
		const b = createMockServer();

		const { register } = await import("../todo");
		register(a.server, { platform: "web" });
		register(b.server, { platform: "web" });

		await a.handlers["todo.add"]({ content: "A1" });
		await a.handlers["todo.add"]({ content: "A2" });
		await a.handlers["todo.add"]({ content: "A3" });

		const resultB = await b.handlers["todo.add"]({ content: "B1" });
		expect(resultB.item.id).toBe("todo-1");
	});
});

// --- Rules ---
describe("Handler 隔离性 - rules", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it("两个独立的 RPCServer 各自维护独立的规则列表", async () => {
		const a = createMockServer();
		const b = createMockServer();

		const { register } = await import("../rules");
		register(a.server, { platform: "web" });
		register(b.server, { platform: "web" });

		await a.handlers["rules.add"]({ name: "rule A", pattern: "*.ts" });

		const listB = await b.handlers["rules.list"]({});
		expect(listB.rules).toHaveLength(0);

		const listA = await a.handlers["rules.list"]({});
		expect(listA.rules).toHaveLength(1);
	});

	it("server A 的 ruleIdCounter 不影响 server B", async () => {
		const a = createMockServer();
		const b = createMockServer();

		const { register } = await import("../rules");
		register(a.server, { platform: "web" });
		register(b.server, { platform: "web" });

		await a.handlers["rules.add"]({ name: "A1", pattern: "*.ts" });
		await a.handlers["rules.add"]({ name: "A2", pattern: "*.js" });

		const resultB = await b.handlers["rules.add"]({ name: "B1", pattern: "*.css" });
		expect(resultB.rule.id).toBe("rule-1");
	});
});
