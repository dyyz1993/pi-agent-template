import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { RPCClient } from "../src/client";
import { RPCServer } from "../src/server";
import { InMemoryTransport } from "../src/transports/in-memory";
import type { RPCEvent } from "../src/core/types";

const TICK = 50;

describe("Subscribe parameter order consistency", () => {
  let server: RPCServer;
  let client: RPCClient;

  beforeEach(() => {
    const pair = InMemoryTransport.createPair();
    server = new RPCServer(pair.server);
    client = new RPCClient({ transport: pair.client });
  });

  afterEach(() => {
    try { client.close(); } catch { /* noop */ }
    try { server.close(); } catch { /* noop */ }
  });

  test("client.subscribe accepts (eventType, handler) without filter", () => {
    const subId = client.subscribe("test.event", () => {});

    expect(subId).toBeTruthy();
    expect(typeof subId).toBe("string");
  });

  test("client.subscribe accepts (eventType, handler, filter) with filter as 3rd arg", () => {
    const subId = client.subscribe("test.event", () => {}, { type: "info" });
    expect(subId).toBeTruthy();
  });

  test("subscribe handler receives event data correctly", async () => {
    const events: RPCEvent[] = [];
    client.subscribe("test.event", (event) => {
      events.push(event);
    });

    await new Promise((r) => setTimeout(r, TICK));

    await server.emitEvent("test.event", { message: "hello" });
    await new Promise((r) => setTimeout(r, TICK));

    expect(events.length).toBe(1);
    expect(events[0].payload).toEqual({ message: "hello" });
  });

  test("subscribe with filter as 3rd arg only receives matching events", async () => {
    const events: RPCEvent[] = [];
    client.subscribe("test.event", (event) => {
      events.push(event);
    }, { type: "important" });

    await new Promise((r) => setTimeout(r, TICK));

    await server.emitEvent("test.event", { message: "important" }, { type: "important" });
    await server.emitEvent("test.event", { message: "normal" }, { type: "normal" });

    await new Promise((r) => setTimeout(r, TICK));

    expect(events.length).toBe(1);
    expect(events[0].payload).toEqual({ message: "important" });
  });

  test("empty filter matches all events", async () => {
    const events: RPCEvent[] = [];
    client.subscribe("test.event", (event) => {
      events.push(event);
    }, {});

    await new Promise((r) => setTimeout(r, TICK));

    await server.emitEvent("test.event", { a: 1 }, { region: "us" });
    await server.emitEvent("test.event", { a: 2 }, { region: "eu" });
    await server.emitEvent("test.event", { a: 3 });

    await new Promise((r) => setTimeout(r, TICK));

    expect(events.length).toBe(3);
  });
});
