import { test, describe, expect } from "bun:test";
import { createTypedServer, createTypedClient, defineRPC, defineModule } from "../src/typed";
import { InMemoryTransport } from "../src/transports/in-memory";

interface TestMethods {
  "test.ping": { params: object; result: { pong: boolean } };
  "test.echo": { params: { message: string }; result: { echo: string } };
  "test.add": { params: { a: number; b: number }; result: { sum: number } };
}

interface TestEvents {
  "test.notification": {
    payload: { text: string };
    metadata?: { priority: number };
  };
}

describe("typed RPC", () => {
  test("createTypedServer + createTypedClient: register and call methods", async () => {
    const { client: clientTransport, server: serverTransport } = InMemoryTransport.createPair();

    const server = createTypedServer<TestMethods, TestEvents>(serverTransport);
    server.handle("test.ping", async () => ({ pong: true }));
    server.handle("test.echo", async (params) => ({ echo: params.message }));
    server.handle("test.add", async (params) => ({ sum: params.a + params.b }));

    const client = createTypedClient<TestMethods, TestEvents>(clientTransport);

    const pingResult = await client.call("test.ping", {});
    expect(pingResult.pong).toBe(true);

    const echoResult = await client.call("test.echo", { message: "hello" });
    expect(echoResult.echo).toBe("hello");

    const addResult = await client.call("test.add", { a: 2, b: 3 });
    expect(addResult.sum).toBe(5);

    client.close();
  });

  test("subscribe should receive typed events", async () => {
    const { client: clientTransport, server: serverTransport } = InMemoryTransport.createPair();

    const server = createTypedServer<TestMethods, TestEvents>(serverTransport);
    server.handle("test.ping", async () => ({ pong: true }));

    const client = createTypedClient<TestMethods, TestEvents>(clientTransport);

    const received: Array<{ text: string }> = [];
    client.subscribe("test.notification", (payload) => {
      received.push(payload);
    });

    await new Promise((r) => setTimeout(r, 10));

    await server.emit("test.notification", { text: "hello" });

    await new Promise((r) => setTimeout(r, 50));

    expect(received).toHaveLength(1);
    expect(received[0].text).toBe("hello");

    client.close();
  });

  test("calling missing method should throw", async () => {
    const { client: clientTransport, server: serverTransport } = InMemoryTransport.createPair();

    createTypedServer<TestMethods, TestEvents>(serverTransport);
    const client = createTypedClient<TestMethods, TestEvents>(clientTransport);

    try {
      await client.call("test.ping", {});
      expect(true).toBe(false);
    } catch (err) {
      expect((err as Error).message).toContain("Method not found");
    }

    client.close();
  });

  test("unsubscribe stops events", async () => {
    const { client: clientTransport, server: serverTransport } = InMemoryTransport.createPair();

    const server = createTypedServer<TestMethods, TestEvents>(serverTransport);
    const client = createTypedClient<TestMethods, TestEvents>(clientTransport);

    const received: Array<{ text: string }> = [];
    const subId = client.subscribe("test.notification", (payload) => {
      received.push(payload);
    });

    await new Promise((r) => setTimeout(r, 10));
    await server.emit("test.notification", { text: "first" });
    await new Promise((r) => setTimeout(r, 50));
    expect(received).toHaveLength(1);

    client.unsubscribe(subId);
    await server.emit("test.notification", { text: "second" });
    await new Promise((r) => setTimeout(r, 50));
    expect(received).toHaveLength(1);

    client.close();
  });

  test("close cleans up server and client", () => {
    const { client: clientTransport, server: serverTransport } = InMemoryTransport.createPair();

    const server = createTypedServer<TestMethods, TestEvents>(serverTransport);
    const client = createTypedClient<TestMethods, TestEvents>(clientTransport);

    server.close();
    client.close();
  });
});

describe("defineRPC / defineModule", () => {
  test("defineRPC should build module with methods", async () => {
    const rpc = defineRPC();
    const mod = rpc
      .method<object, { pong: boolean }>("test.ping", async () => ({ pong: true }))
      .method<{ n: number }, { doubled: number }>("test.double", async (p) => ({ doubled: p.n * 2 }))
      .toModule();

    expect("test.ping" in mod.handlers).toBe(true);
    expect("test.double" in mod.handlers).toBe(true);

    const pingResult = await mod.handlers["test.ping"]({});
    expect(pingResult).toEqual({ pong: true });

    const doubleResult = await mod.handlers["test.double"]({ n: 5 });
    expect(doubleResult).toEqual({ doubled: 10 });
  });

  test("defineModule should create module from builder function", () => {
    const mod = defineModule((rpc) =>
      rpc.method("math.add", async (p: { a: number; b: number }) => ({ sum: p.a + p.b }))
    );

    expect("math.add" in mod.handlers).toBe(true);
  });

  test("merge should combine multiple modules", () => {
    const rpc = defineRPC();
    const mod1 = rpc.method("m1.ping", async () => ({ result: "pong1" })).toModule();
    const mod2 = rpc.method("m2.ping", async () => ({ result: "pong2" })).toModule();

    const merged = rpc.merge(mod1).merge(mod2).toModule();
    expect("m1.ping" in merged.handlers).toBe(true);
    expect("m2.ping" in merged.handlers).toBe(true);
  });

  test("createServer from builder should register all methods", async () => {
    const { client: clientTransport, server: serverTransport } = InMemoryTransport.createPair();

    const rpc = defineRPC();
    rpc
      .method<object, { ok: boolean }>("health", async () => ({ ok: true }))
      .createServer(serverTransport);

    const client = createTypedClient<{ health: { params: object; result: { ok: boolean } } }, object>(clientTransport);

    const result = await client.call("health", {});
    expect(result.ok).toBe(true);

    client.close();
  });

  test("createClient from builder should work with createServer", async () => {
    const { client: clientTransport, server: serverTransport } = InMemoryTransport.createPair();

    const rpc = defineRPC();
    rpc.method<object, { version: string }>("version", async () => ({ version: "1.0.0" }));

    rpc.createServer(serverTransport);
    const client = rpc.createClient(clientTransport);

    const result = await client.call("version", {});
    expect(result).toEqual({ version: "1.0.0" });

    client.close();
  });
});
