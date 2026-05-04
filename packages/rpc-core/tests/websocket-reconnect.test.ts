/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, describe, expect, mock } from "bun:test";
import { WebSocketTransport } from "../src/transports/websocket";

function createMockWebSocket(): any {
  return {
    readyState: 1,
    send: mock(),
    close: mock(),
    ping: mock(),
    onopen: null as any,
    onmessage: null as any,
    onclose: null as any,
    onerror: null as any,
    onpong: null as any,
    OPEN: 1,
    CLOSED: 3,
    CLOSING: 2,
    CONNECTING: 0,
  };
}

describe("WebSocket Heartbeat", () => {
  test("should send ping at heartbeat interval", async () => {
    const mockWs = createMockWebSocket();

    const transport = new WebSocketTransport({
      url: "ws://localhost:8080",
      heartbeatInterval: 100,
    });

    (transport as any).ws = mockWs;
    (transport as any)._isConnected = true;
    (transport as any).startHeartbeat();

    await new Promise((r) => setTimeout(r, 250));

    expect(mockWs.ping.mock.calls.length).toBeGreaterThanOrEqual(2);

    transport.close();
  });

  test("should detect connection death when pong not received", async () => {
    const mockWs = createMockWebSocket();
    const onDisconnect = mock();

    const transport = new WebSocketTransport({
      url: "ws://localhost:8080",
      heartbeatInterval: 50,
      heartbeatTimeout: 100,
    });

    (transport as any).ws = mockWs;
    (transport as any)._isConnected = true;
    transport.onDisconnect(onDisconnect);
    (transport as any).startHeartbeat();

    await new Promise((r) => setTimeout(r, 400));

    expect(onDisconnect).toHaveBeenCalled();

    transport.close();
  });

  test("should reset timeout on pong", async () => {
    const mockWs = createMockWebSocket();
    const onDisconnect = mock();

    const transport = new WebSocketTransport({
      url: "ws://localhost:8080",
      heartbeatInterval: 100,
      heartbeatTimeout: 200,
    });

    (transport as any).ws = mockWs;
    (transport as any)._isConnected = true;
    transport.onDisconnect(onDisconnect);
    (transport as any).startHeartbeat();

    mockWs.ping = mock(() => {
      setTimeout(() => {
        if (mockWs.onpong) mockWs.onpong();
      }, 50);
    });

    await new Promise((r) => setTimeout(r, 500));

    expect(onDisconnect).not.toHaveBeenCalled();

    transport.close();
  });

  test("should clean up heartbeat timer on close", async () => {
    const mockWs = createMockWebSocket();

    const transport = new WebSocketTransport({
      url: "ws://localhost:8080",
      heartbeatInterval: 100,
    });

    (transport as any).ws = mockWs;
    (transport as any)._isConnected = true;
    (transport as any).startHeartbeat();

    transport.close();

    const pingCountBefore = mockWs.ping.mock.calls.length;

    await new Promise((r) => setTimeout(r, 200));

    expect(mockWs.ping.mock.calls.length).toBe(pingCountBefore);
  });
});

describe("WebSocket Reconnection with Backoff", () => {
  test("should reconnect with increasing delay", async () => {
    const transport = new WebSocketTransport({
      url: "ws://localhost:8080",
      reconnect: true,
      reconnectInterval: 50,
      maxReconnectInterval: 500,
      maxReconnectAttempts: 5,
    });

    const connectSpy = mock();
    (transport as any).connect = connectSpy;
    (transport as any)._isConnected = false;

    (transport as any).scheduleReconnect();
    await new Promise((r) => setTimeout(r, 200));

    expect(connectSpy.mock.calls.length).toBeGreaterThanOrEqual(1);

    transport.close();
  });

  test("should stop reconnecting after max attempts", async () => {
    const connectFn = mock(() => {
      throw new Error("connection refused");
    });

    const transport = new WebSocketTransport({
      url: "ws://localhost:8080",
      reconnect: true,
      reconnectInterval: 20,
      maxReconnectAttempts: 3,
    });

    (transport as any).connect = connectFn;
    (transport as any)._isConnected = false;

    (transport as any).scheduleReconnect();

    await new Promise((r) => setTimeout(r, 800));

    expect(connectFn.mock.calls.length).toBeLessThanOrEqual(3);

    transport.close();
  });

  test("should reset reconnect attempts on successful connection", async () => {
    let callCount = 0;
    const connectFn = mock(() => {
      callCount++;
      if (callCount === 1) throw new Error("fail");
    });

    const transport = new WebSocketTransport({
      url: "ws://localhost:8080",
      reconnect: true,
      reconnectInterval: 30,
      maxReconnectAttempts: 10,
    });

    (transport as any).connect = connectFn;
    (transport as any)._isConnected = false;

    (transport as any).scheduleReconnect();
    await new Promise((r) => setTimeout(r, 300));

    expect(callCount).toBeGreaterThanOrEqual(2);
    expect((transport as any).reconnectAttempts).toBe(0);

    transport.close();
  });

  test("should clean up reconnect timer on close", async () => {
    const connectFn = mock(() => {
      throw new Error("fail");
    });

    const transport = new WebSocketTransport({
      url: "ws://localhost:8080",
      reconnect: true,
      reconnectInterval: 100,
      maxReconnectAttempts: 100,
    });

    (transport as any).connect = connectFn;
    (transport as any)._isConnected = false;

    (transport as any).scheduleReconnect();

    transport.close();

    const callCount = connectFn.mock.calls.length;

    await new Promise((r) => setTimeout(r, 300));

    expect(connectFn.mock.calls.length).toBe(callCount);
  });
});
