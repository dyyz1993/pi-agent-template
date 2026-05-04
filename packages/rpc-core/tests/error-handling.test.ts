import { test, describe, expect, mock } from "bun:test";
import { RPCClient } from "../src/client";
import { RPCServer } from "../src/server";
import { InMemoryTransport } from "../src/transports/in-memory";

describe("RPC Error Handling", () => {
  describe("server error handling", () => {
    test("should call onError callback when handler throws", async () => {
      const { client: clientTransport, server: serverTransport } = InMemoryTransport.createPair();
      const onError = mock();

      const server = new RPCServer(serverTransport, { onError });
      server.register("test.throw", async () => {
        throw new Error("handler error");
      });

      const client = new RPCClient({ transport: clientTransport, timeout: 5000 });

      try {
        await client.call("test.throw", {});
      } catch (err) {
        expect((err as Error).message).toContain("handler error");
      }

      expect(onError).toHaveBeenCalled();
    });

    test("should handle handler throwing non-Error objects", async () => {
      const { client: clientTransport, server: serverTransport } = InMemoryTransport.createPair();
      const onError = mock();

      const server = new RPCServer(serverTransport, { onError });
      server.register("test.stringThrow", async () => {
        throw "string error";
      });

      const client = new RPCClient({ transport: clientTransport, timeout: 5000 });
      try {
        await client.call("test.stringThrow", {});
      } catch (err) {
        expect((err as Error).message).toBe("Internal server error");
      }

      expect(onError).toHaveBeenCalled();
    });

    test("should not crash when error response send fails", async () => {
      const { client: clientTransport, server: serverTransport } = InMemoryTransport.createPair();
      const onError = mock();

      const server = new RPCServer(serverTransport, { onError });
      server.register("test.crash", async () => {
        throw new Error("boom");
      });

      // Close server transport to make send fail in the handler's catch block
      serverTransport.close();

      const client = new RPCClient({ transport: clientTransport, timeout: 200 });

      // This should timeout (server can't respond since transport is closed),
      // but server should not crash
      await expect(client.call("test.crash", {})).rejects.toThrow();
    });

    test("should return 404 for unregistered methods", async () => {
      const { client: clientTransport, server: serverTransport } = InMemoryTransport.createPair();
      new RPCServer(serverTransport);

      const client = new RPCClient({ transport: clientTransport, timeout: 5000 });
      try {
        await client.call("nonexistent.method", {});
      } catch (err) {
        expect((err as Error).message).toContain("Method not found");
      }
    });
  });

  describe("client error handling", () => {
    test("should protect other subscribers when one handler throws", async () => {
      const { client: clientTransport, server: serverTransport } = InMemoryTransport.createPair();
      void new RPCServer(serverTransport);
      const client = new RPCClient({ transport: clientTransport, timeout: 5000 });

      const handler2 = mock();
      const handler1 = mock(() => {
        throw new Error("handler1 error");
      });

      // Subscribe both handlers with empty filters (same key, so second replaces first)
      // Use two separate client instances to get independent subscriptions
      // OR: send raw event directly to bypass server-side filter matching
      client.subscribe("test.event", {}, handler1);

      // Second client on same transport pair
      const client2 = new RPCClient({ transport: clientTransport, timeout: 5000 });
      client2.subscribe("test.event", {}, handler2);

      await new Promise((r) => setTimeout(r, 10));

      // Send raw event directly from server transport to client transport
      // This bypasses server-side subscription matching
      serverTransport.send({
        id: "evt-1",
        type: "event",
        eventType: "test.event",
        payload: "hello",
        timestamp: Date.now(),
      });

      await new Promise((r) => setTimeout(r, 50));

      // handler2 should still be called despite handler1 throwing
      expect(handler2).toHaveBeenCalled();
    });

    test("should call onError callback when event handler throws", async () => {
      const { client: clientTransport, server: serverTransport } = InMemoryTransport.createPair();
      const onError = mock();
      void new RPCServer(serverTransport);
      const client = new RPCClient({ transport: clientTransport, timeout: 5000, onError });

      client.subscribe("test.event", {}, () => {
        throw new Error("subscriber error");
      });

      await new Promise((r) => setTimeout(r, 10));

      serverTransport.send({
        id: "evt-err",
        type: "event",
        eventType: "test.event",
        payload: "trigger",
        timestamp: Date.now(),
      });

      await new Promise((r) => setTimeout(r, 50));

      expect(onError).toHaveBeenCalled();
    });

    test("should reject pending requests on timeout", async () => {
      const { client: clientTransport, server: serverTransport } = InMemoryTransport.createPair();
      void new RPCServer(serverTransport);

      const client = new RPCClient({ transport: clientTransport, timeout: 100 });

      await expect(client.call("test.timeout", {})).rejects.toThrow(/timeout/i);
    });
  });

  describe("message validation", () => {
    test("should handle malformed messages gracefully without crashing", async () => {
      const { client: clientTransport, server: serverTransport } = InMemoryTransport.createPair();
      const onError = mock();

      const server = new RPCServer(serverTransport, { onError });
      server.register("test.ping", async () => "pong");

      // Create a new client on same server transport to send malformed data
      // We'll directly invoke the message handler by sending from clientTransport
      // clientTransport.send goes to serverTransport.messageHandlers

      // Send malformed messages via the client transport (delivered to server's onMessage)
      // null
      clientTransport.send(null);
      // string
      clientTransport.send("not an object");
      // object without type
      clientTransport.send({ id: "123" });
      // object with invalid type
      clientTransport.send({ type: "invalid", id: "123" });

      await new Promise((r) => setTimeout(r, 50));

      // Server should still work
      const client = new RPCClient({ transport: clientTransport, timeout: 5000 });
      const result = await client.call("test.ping", {});
      expect(result).toBe("pong");
    });
  });
});
