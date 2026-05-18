#!/usr/bin/env bun
/* eslint-disable no-console */

/**
 * Multi-template RPC API integration test.
 * Tests all RPC endpoints for each template (general, chat, agent).
 *
 * Usage:
 *   bun run scripts/rpc-api-test.ts [--template <name>] [--port <port>]
 *
 * Examples:
 *   bun run scripts/rpc-api-test.ts                           # test all 3 templates
 *   bun run scripts/rpc-api-test.ts --template chat --port 3110  # test chat only
 *
 * Requires running dev servers:
 *   General: PORT=3100 bun run dev:web (in templates/general)
 *   Chat:    PORT=3110 bun run dev:web (in templates/chat)
 *   Agent:   PORT=3120 bun run dev:web (in templates/agent)
 */

import { RPCClient, WebSocketTransport } from "../packages/rpc-core/src/index";

type TestResult = { name: string; pass: boolean; detail: string };

interface TemplateConfig {
	name: string;
	port: number;
	token: string;
	methods: string[];
}

const TEMPLATES: TemplateConfig[] = [
	{
		name: "general",
		port: 3100,
		token: "verify-general-token",
		methods: [
			"system.ping",
			"system.hello",
			"system.echo",
			"chat.list",
			"chat.send",
			"feed.post",
			"feed.list",
			"git.status",
			"file.listDir",
			"timer.start",
			"timer.stop",
		],
	},
	{
		name: "chat",
		port: 3110,
		token: "verify-chat-token",
		methods: ["system.ping", "system.hello", "system.echo", "chat.list", "chat.send"],
	},
	{
		name: "agent",
		port: 3120,
		token: "verify-agent-token",
		methods: [
			"system.ping",
			"system.hello",
			"system.echo",
			"chat.list",
			"chat.send",
			"bash.execute",
			"bash.kill",
			"bash.listProcesses",
			"rules.list",
			"rules.add",
			"rules.toggle",
			"rules.remove",
			"todo.list",
			"todo.add",
			"todo.update",
			"todo.remove",
			"feed.post",
			"feed.list",
			"git.status",
			"git.diff",
			"git.log",
			"file.listDir",
			"file.readFile",
		],
	},
];

async function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}

async function checkHealth(port: number): Promise<boolean> {
	try {
		const res = await fetch(`http://localhost:${port}/health`);
		const body = (await res.json()) as Record<string, unknown>;
		return body.status === "ok";
	} catch {
		return false;
	}
}

async function createClient(
	port: number,
	token: string
): Promise<{ client: RPCClient; transport: WebSocketTransport }> {
	const transport = new WebSocketTransport({
		url: `ws://localhost:${port}/ws?token=${token}`,
		reconnect: false,
	});
	await transport.connect();
	const client = new RPCClient({ transport, timeout: 10_000 });
	return { client, transport };
}

async function testTemplate(config: TemplateConfig): Promise<TestResult[]> {
	const results: TestResult[] = [];
	const { name, port } = config;

	const pass = (n: string, d: string) => results.push({ name: n, pass: true, detail: d });
	const fail = (n: string, d: string) => results.push({ name: n, pass: false, detail: d });

	// --- HTTP Tests ---

	// Health
	{
		const label = `[${name}] GET /health`;
		try {
			const res = await fetch(`http://localhost:${port}/health`);
			const body = (await res.json()) as Record<string, unknown>;
			if (body.status === "ok") {
				pass(label, `{ status: "ok" }`);
			} else {
				fail(label, JSON.stringify(body));
			}
		} catch (e) {
			fail(label, (e as Error).message);
		}
	}

	// Auth rejection
	{
		const label = `[${name}] GET /info/ (no token) → 401`;
		try {
			const res = await fetch(`http://localhost:${port}/info/`);
			if (res.status === 401) {
				pass(label, "401 Unauthorized");
			} else {
				fail(label, `got ${res.status}`);
			}
		} catch (e) {
			fail(label, (e as Error).message);
		}
	}

	// WS auth rejection
	{
		const label = `[${name}] WS wrong token → 4001`;
		const authResult = await new Promise<string>((resolve) => {
			const ws = new WebSocket(`ws://localhost:${port}/ws?token=wrong`);
			const timer = setTimeout(() => resolve("timeout"), 3000);
			ws.onclose = (ev: CloseEvent) => {
				clearTimeout(timer);
				resolve(`closed:${ev.code}`);
			};
			ws.onerror = () => {
				clearTimeout(timer);
				resolve("error");
			};
		});
		if (authResult === "closed:4001") {
			pass(label, "closed:4001");
		} else {
			fail(label, authResult);
		}
	}

	// --- RPC Tests ---
	let client: RPCClient | null = null;
	let transport: WebSocketTransport | null = null;

	try {
		const c = await createClient(port, config.token);
		client = c.client;
		transport = c.transport;

		// system.ping
		{
			const label = `[${name}] system.ping`;
			try {
				const r = await client.call<{ pong: boolean; timestamp: number }>("system.ping", {});
				if (r.pong === true && typeof r.timestamp === "number") {
					pass(label, `{ pong: true, timestamp: ${r.timestamp} }`);
				} else {
					fail(label, JSON.stringify(r));
				}
			} catch (e) {
				fail(label, (e as Error).message);
			}
		}

		// system.hello
		{
			const label = `[${name}] system.hello`;
			try {
				const r = await client.call<{ message: string }>("system.hello", { name: "TestBot" });
				if (r.message === "Hello TestBot!") {
					pass(label, `"${r.message}"`);
				} else {
					fail(label, JSON.stringify(r));
				}
			} catch (e) {
				fail(label, (e as Error).message);
			}
		}

		// system.echo
		{
			const label = `[${name}] system.echo`;
			try {
				const payload = { hello: "world", count: 42 };
				const r = await client.call<typeof payload>("system.echo", payload);
				if (JSON.stringify(r) === JSON.stringify(payload)) {
					pass(label, "payload echoed");
				} else {
					fail(label, `mismatch: ${JSON.stringify(r)}`);
				}
			} catch (e) {
				fail(label, (e as Error).message);
			}
		}

		// chat.send + chat.list (if supported)
		if (config.methods.includes("chat.send")) {
			const label1 = `[${name}] chat.send`;
			const label2 = `[${name}] chat.list`;
			try {
				const r = await client.call<{ ok: boolean }>("chat.send", { content: "rpc-test-msg" });
				if (r.ok === true) {
					pass(label1, `{ ok: true }`);
				} else {
					fail(label1, JSON.stringify(r));
				}
			} catch (e) {
				fail(label1, (e as Error).message);
			}

			await sleep(200);

			try {
				const r = await client.call<{ messages: unknown[]; hasMore: boolean }>("chat.list", {
					limit: 10,
				});
				if (Array.isArray(r.messages) && typeof r.hasMore === "boolean") {
					pass(label2, `${r.messages.length} messages, hasMore=${r.hasMore}`);
				} else {
					fail(label2, JSON.stringify(r));
				}
			} catch (e) {
				fail(label2, (e as Error).message);
			}
		}

		// timer
		if (config.methods.includes("timer.start")) {
			const label1 = `[${name}] timer.start`;
			const label2 = `[${name}] timer.stop`;
			let timerId: string | undefined;

			try {
				const r = await client.call<Record<string, unknown>>("timer.start", {
					duration: 10000,
					label: "test-timer",
				});
				timerId =
					((r.timer as Record<string, unknown>)?.id as string | undefined) ||
					(r.id as string | undefined);
				if (r.started === true || (r.timer as Record<string, unknown>)?.status === "running") {
					pass(label1, timerId ? `id=${timerId}` : `started=true`);
				} else {
					fail(label1, JSON.stringify(r));
				}
			} catch (e) {
				fail(label1, (e as Error).message);
			}

			if (timerId && config.methods.includes("timer.stop")) {
				try {
					const r = await client.call<Record<string, unknown>>("timer.stop", { id: timerId });
					const stopped =
						r.stopped === true || (r.timer as Record<string, unknown>)?.status === "stopped";
					if (stopped) {
						pass(label2, `stopped ${timerId}`);
					} else {
						fail(label2, JSON.stringify(r));
					}
				} catch (e) {
					fail(label2, (e as Error).message);
				}
			}
		}

		// bash (agent only)
		if (config.methods.includes("bash.execute")) {
			const label1 = `[${name}] bash.execute`;
			const label2 = `[${name}] bash.listProcesses`;
			let bashPid: number | undefined;

			try {
				const r = await client.call<{ pid: number; output: string }>("bash.execute", {
					command: "echo rpc-test",
				});
				bashPid = r.pid;
				if (r.output?.includes("rpc-test")) {
					pass(label1, `pid=${r.pid}, output contains "rpc-test"`);
				} else {
					fail(label1, JSON.stringify(r));
				}
			} catch (e) {
				fail(label1, (e as Error).message);
			}

			try {
				const r = await client.call<{ processes: unknown[] }>("bash.listProcesses", {});
				if (Array.isArray(r.processes)) {
					pass(label2, `${r.processes.length} processes`);
				} else {
					fail(label2, JSON.stringify(r));
				}
			} catch (e) {
				fail(label2, (e as Error).message);
			}

			if (bashPid) {
				try {
					const r = await client.call<{ success: boolean }>("bash.kill", { pid: bashPid });
					if (r.success === true) {
						pass(`[${name}] bash.kill`, `killed ${bashPid}`);
					} else {
						fail(`[${name}] bash.kill`, JSON.stringify(r));
					}
				} catch (e) {
					fail(`[${name}] bash.kill`, (e as Error).message);
				}
			}
		}

		// rules (agent only)
		if (config.methods.includes("rules.add")) {
			const label1 = `[${name}] rules.add`;
			const label2 = `[${name}] rules.list`;
			const label3 = `[${name}] rules.toggle`;
			const label4 = `[${name}] rules.remove`;
			let ruleId: string | undefined;

			try {
				const r = await client.call<{ rule: { id: string; name: string; enabled: boolean } }>(
					"rules.add",
					{
						name: "RPC Test Rule",
						pattern: "**/*.test.ts",
					}
				);
				ruleId = r.rule?.id;
				if (r.rule?.name === "RPC Test Rule") {
					pass(label1, `id=${ruleId}, name="${r.rule.name}"`);
				} else {
					fail(label1, JSON.stringify(r));
				}
			} catch (e) {
				fail(label1, (e as Error).message);
			}

			try {
				const r = await client.call<{ rules: unknown[] }>("rules.list", {});
				if (Array.isArray(r.rules)) {
					pass(label2, `${r.rules.length} rules`);
				} else {
					fail(label2, JSON.stringify(r));
				}
			} catch (e) {
				fail(label2, (e as Error).message);
			}

			if (ruleId) {
				try {
					const r = await client.call<{ rule: { id: string; enabled: boolean } }>("rules.toggle", {
						id: ruleId,
					});
					if (typeof r.rule?.enabled === "boolean") {
						pass(label3, `enabled=${r.rule.enabled}`);
					} else {
						fail(label3, JSON.stringify(r));
					}
				} catch (e) {
					fail(label3, (e as Error).message);
				}

				try {
					const r = await client.call<{ success: boolean }>("rules.remove", { id: ruleId });
					if (r.success === true) {
						pass(label4, `removed ${ruleId}`);
					} else {
						fail(label4, JSON.stringify(r));
					}
				} catch (e) {
					fail(label4, (e as Error).message);
				}
			}
		}

		// todo (agent only)
		if (config.methods.includes("todo.add")) {
			const label1 = `[${name}] todo.add`;
			const label2 = `[${name}] todo.list`;
			const label3 = `[${name}] todo.update`;
			const label4 = `[${name}] todo.remove`;
			let todoId: string | undefined;

			try {
				const r = await client.call<{ item: { id: string; content: string; status: string } }>(
					"todo.add",
					{
						content: "RPC test task",
					}
				);
				todoId = r.item?.id;
				if (r.item?.content === "RPC test task") {
					pass(label1, `id=${todoId}`);
				} else {
					fail(label1, JSON.stringify(r));
				}
			} catch (e) {
				fail(label1, (e as Error).message);
			}

			try {
				const r = await client.call<{ items: unknown[] }>("todo.list", {});
				if (Array.isArray(r.items)) {
					pass(label2, `${r.items.length} items`);
				} else {
					fail(label2, JSON.stringify(r));
				}
			} catch (e) {
				fail(label2, (e as Error).message);
			}

			if (todoId) {
				try {
					const r = await client.call<{ item: { id: string; status: string } }>("todo.update", {
						id: todoId,
						status: "completed",
					});
					if (r.item?.status === "completed") {
						pass(label3, `status=completed`);
					} else {
						fail(label3, JSON.stringify(r));
					}
				} catch (e) {
					fail(label3, (e as Error).message);
				}

				try {
					const r = await client.call<{ success: boolean }>("todo.remove", { id: todoId });
					if (r.success === true) {
						pass(label4, `removed ${todoId}`);
					} else {
						fail(label4, JSON.stringify(r));
					}
				} catch (e) {
					fail(label4, (e as Error).message);
				}
			}
		}

		// feed (general + agent)
		if (config.methods.includes("feed.post")) {
			const label1 = `[${name}] feed.post`;
			const label2 = `[${name}] feed.list`;
			let subId: string | undefined;

			try {
				const r = await client.call<{ id: string }>("feed.post", {
					content: "RPC feed test",
					category: "test",
				});
				if (r.id) {
					pass(label1, `id=${r.id}`);
				} else {
					fail(label1, JSON.stringify(r));
				}
			} catch (e) {
				fail(label1, (e as Error).message);
			}

			try {
				const r = await client.call<{ posts: unknown[] }>("feed.list", {});
				if (Array.isArray(r.posts)) {
					pass(label2, `${r.posts.length} posts`);
				} else {
					fail(label2, JSON.stringify(r));
				}
			} catch (e) {
				fail(label2, (e as Error).message);
			}

			if (config.methods.includes("feed.subscribe")) {
				try {
					const r = await client.call<{ subscriptionId: string }>("feed.subscribe", {
						events: ["chat.message"],
					});
					subId = r.subscriptionId;
					if (subId) {
						pass(`[${name}] feed.subscribe`, `id=${subId}`);
					} else {
						fail(`[${name}] feed.subscribe`, JSON.stringify(r));
					}
				} catch (e) {
					fail(`[${name}] feed.subscribe`, (e as Error).message);
				}

				if (subId) {
					try {
						const r = await client.call<{ success: boolean }>("feed.unsubscribe", {
							subscriptionId: subId,
						});
						if (r.success === true) {
							pass(`[${name}] feed.unsubscribe`, "success");
						} else {
							fail(`[${name}] feed.unsubscribe`, JSON.stringify(r));
						}
					} catch (e) {
						fail(`[${name}] feed.unsubscribe`, (e as Error).message);
					}
				}
			}
		}

		// git (general + agent)
		if (config.methods.includes("git.status")) {
			try {
				const r = await client.call<{
					branch: string;
					staged: number;
					changed: number;
					untracked: number;
				}>("git.status", {
					repoPath: process.cwd(),
				});
				if (typeof r.branch === "string") {
					pass(`[${name}] git.status`, `branch=${r.branch}`);
				} else {
					fail(`[${name}] git.status`, JSON.stringify(r));
				}
			} catch (e) {
				fail(`[${name}] git.status`, (e as Error).message);
			}
		}

		// file (general + agent)
		if (config.methods.includes("file.listDir")) {
			try {
				const r = await client.call<{ entries: unknown[] }>("file.listDir", { path: "." });
				if (Array.isArray(r.entries)) {
					pass(`[${name}] file.listDir`, `${r.entries.length} entries`);
				} else {
					fail(`[${name}] file.listDir`, JSON.stringify(r));
				}
			} catch (e) {
				fail(`[${name}] file.listDir`, (e as Error).message);
			}
		}

		// search (general + agent)
		if (config.methods.includes("search.search")) {
			try {
				const r = await client.call<{ results: unknown[]; totalMatches: number }>("search.search", {
					query: "import",
					directory: ".",
				});
				if (typeof r.totalMatches === "number") {
					pass(`[${name}] search.search`, `${r.totalMatches} matches`);
				} else {
					fail(`[${name}] search.search`, JSON.stringify(r));
				}
			} catch (e) {
				fail(`[${name}] search.search`, (e as Error).message);
			}
		}
	} catch (e) {
		fail(`[${name}] RPC connection`, (e as Error).message);
	} finally {
		transport?.close();
	}

	return results;
}

async function main() {
	const args = process.argv.slice(2);
	let filterTemplate: string | undefined;
	let filterPort: number | undefined;

	for (let i = 0; i < args.length; i++) {
		if (args[i] === "--template" && args[i + 1]) filterTemplate = args[++i]!;
		if (args[i] === "--port" && args[i + 1]) filterPort = parseInt(args[++i]!, 10);
	}

	const targets = TEMPLATES.filter((t) => {
		if (filterTemplate && t.name !== filterTemplate) return false;
		if (filterPort && t.port !== filterPort) return false;
		return true;
	});

	if (targets.length === 0) {
		console.error("No matching templates. Available: general, chat, agent");
		process.exit(1);
	}

	console.log(`\n${"=".repeat(60)}`);
	console.log(`RPC API Integration Test — ${targets.length} template(s)`);
	console.log(`${"=".repeat(60)}\n`);

	let totalPassed = 0;
	let totalFailed = 0;

	for (const target of targets) {
		console.log(`\n--- ${target.name.toUpperCase()} (port ${target.port}) ---`);

		const healthy = await checkHealth(target.port);
		if (!healthy) {
			console.log(`  SKIP: server not responding on port ${target.port}`);
			console.log(`  Start with: PORT=${target.port} bun run dev:web\n`);
			continue;
		}

		const results = await testTemplate(target);

		for (const r of results) {
			const icon = r.pass ? "PASS" : "FAIL";
			console.log(`  [${icon}] ${r.name} — ${r.detail}`);
			if (r.pass) {
				totalPassed++;
			} else {
				totalFailed++;
			}
		}

		const passed = results.filter((r) => r.pass).length;
		console.log(`  → ${passed}/${results.length} passed\n`);
	}

	console.log(`\n${"=".repeat(60)}`);
	console.log(`TOTAL: ${totalPassed} passed, ${totalFailed} failed`);
	console.log(`${"=".repeat(60)}\n`);

	process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch((e) => {
	console.error("Fatal:", e);
	process.exit(1);
});
