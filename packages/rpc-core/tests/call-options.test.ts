import { describe, expect, test } from "bun:test";
import {
	RPCAbortError,
	RPCClient,
	RPCServer,
	RPCTransportError,
	createTypedClient,
	createTypedServer,
} from "../src";
import { InMemoryTransport } from "../src/transports/in-memory";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("RPC per-call options", () => {
	test("per-call timeout can be shorter than the client default", async () => {
		const { client: clientTransport, server: serverTransport } = InMemoryTransport.createPair();
		const server = new RPCServer(serverTransport);
		const client = new RPCClient({ transport: clientTransport, timeout: 1000 });

		server.register("slow", async () => {
			await sleep(100);
			return "late";
		});

		await expect(client.call("slow", {}, { timeoutMs: 20 })).rejects.toThrow(/timeout/i);

		client.close();
		server.close();
	});

	test("per-call timeout can be longer than the client default", async () => {
		const { client: clientTransport, server: serverTransport } = InMemoryTransport.createPair();
		const server = new RPCServer(serverTransport);
		const client = new RPCClient({ transport: clientTransport, timeout: 20 });

		server.register("slow", async () => {
			await sleep(60);
			return "ok";
		});

		await expect(client.call("slow", {}, { timeoutMs: 200 })).resolves.toBe("ok");

		client.close();
		server.close();
	});

	test("concurrent calls use independent timeout windows", async () => {
		const { client: clientTransport, server: serverTransport } = InMemoryTransport.createPair();
		const server = new RPCServer(serverTransport);
		const client = new RPCClient({ transport: clientTransport, timeout: 500 });

		server.register("delay", async (params) => {
			const { ms } = params as { ms: number };
			await sleep(ms);
			return ms;
		});

		const fast = client.call("delay", { ms: 10 }, { timeoutMs: 100 });
		const slow = client.call("delay", { ms: 120 }, { timeoutMs: 30 });

		await expect(fast).resolves.toBe(10);
		await expect(slow).rejects.toThrow(/timeout/i);

		await expect(client.call("delay", { ms: 5 })).resolves.toBe(5);

		client.close();
		server.close();
	});

	test("abort signal rejects and cleans pending request state", async () => {
		const { client: clientTransport, server: serverTransport } = InMemoryTransport.createPair();
		const server = new RPCServer(serverTransport);
		const client = new RPCClient({ transport: clientTransport, timeout: 500 });
		const controller = new AbortController();

		server.register("slow", async () => {
			await sleep(100);
			return "late";
		});

		const call = client.call("slow", {}, { signal: controller.signal });
		controller.abort();

		await expect(call).rejects.toBeInstanceOf(RPCAbortError);
		await expect(client.call("ping", {})).rejects.toThrow(/Method not found/);

		client.close();
		server.close();
	});

	test("typed client forwards per-call options", async () => {
		interface Methods {
			"test.slow": { params: { ms: number }; result: { waited: number } };
		}

		type Events = Record<string, never>;

		const { client: clientTransport, server: serverTransport } = InMemoryTransport.createPair();
		const server = createTypedServer<Methods, Events>(serverTransport);
		const client = createTypedClient<Methods, Events>(clientTransport, { timeout: 20 });

		server.handle("test.slow", async ({ ms }) => {
			await sleep(ms);
			return { waited: ms };
		});

		await expect(client.call("test.slow", { ms: 60 }, { timeoutMs: 200 })).resolves.toEqual({
			waited: 60,
		});

		client.close();
		server.close();
	});

	test("retry only retries transport send failures", async () => {
		const { client: clientTransport, server: serverTransport } = InMemoryTransport.createPair();
		const server = new RPCServer(serverTransport);
		const client = new RPCClient({ transport: clientTransport, timeout: 500 });
		let sendAttempts = 0;
		const originalSend = clientTransport.send.bind(clientTransport);

		clientTransport.send = async (message: unknown) => {
			sendAttempts++;
			if (sendAttempts === 1) {
				throw new Error("temporary transport failure");
			}
			return originalSend(message);
		};

		server.register("ping", async () => "pong");

		await expect(
			client.call("ping", {}, { retry: { maxAttempts: 2, baseDelayMs: 0, jitter: false } })
		).resolves.toBe("pong");
		expect(sendAttempts).toBe(2);

		client.close();
		server.close();
	});

	test("transport failures are not retried by default", async () => {
		const { client: clientTransport, server: serverTransport } = InMemoryTransport.createPair();
		const server = new RPCServer(serverTransport);
		const client = new RPCClient({ transport: clientTransport, timeout: 500 });
		let sendAttempts = 0;

		clientTransport.send = async () => {
			sendAttempts++;
			throw new Error("transport down");
		};

		await expect(client.call("ping", {})).rejects.toBeInstanceOf(RPCTransportError);
		expect(sendAttempts).toBe(1);

		client.close();
		server.close();
	});
});
