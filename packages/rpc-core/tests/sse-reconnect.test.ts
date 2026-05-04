/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { RPCServer, RPCClient, SSETransport } from '../src/index';
import type { RPCEvent } from '../src/index';

const TICK = 50;

describe('[HTTP+SSE] 断线重连测试', () => {
  let serverTransport: SSETransport;
  let clientTransport: SSETransport;
  let server: RPCServer;
  let client: RPCClient;

  beforeEach(async () => {
    const pair = await SSETransport.createPair();
    serverTransport = pair.server as SSETransport;
    clientTransport = pair.client as SSETransport;
    server = new RPCServer(serverTransport);
    client = new RPCClient({ transport: clientTransport, timeout: 2000 });
  });

  afterEach(() => {
    try { server.close(); } catch { /* cleanup */ }
    try { client.close(); } catch { /* cleanup */ }
  });

  describe('断线检测', () => {
    test('服务端断开 SSE 触发 onDisconnect', async () => {
      let disconnected = false;
      clientTransport.onDisconnect(() => { disconnected = true; });

      serverTransport.simulateDisconnect(clientTransport);
      await new Promise(r => setTimeout(r, TICK));

      expect(disconnected).toBe(true);
      expect(clientTransport.isConnected()).toBe(false);
      expect(serverTransport.isConnected()).toBe(false);
    });

    test('断线后 call 超时', async () => {
      server.register('test', async () => 'ok');

      serverTransport.simulateDisconnect(clientTransport);
      await new Promise(r => setTimeout(r, TICK));

      const fastClient = new RPCClient({ transport: clientTransport, timeout: 200 });
      try {
        await fastClient.call('test');
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeDefined();
      } finally {
        fastClient.close();
      }
    });

    test('断线后 server emit 客户端收不到', async () => {
      const events: unknown[] = [];
      client.subscribe('evt', {}, (e) => { events.push(e); });
      await new Promise(r => setTimeout(r, TICK));

      serverTransport.simulateDisconnect(clientTransport);
      await new Promise(r => setTimeout(r, TICK));

      try { await server.emitEvent('evt', { n: 1 }); } catch { /* expected after disconnect */ }
      await new Promise(r => setTimeout(r, TICK));

      expect(events.length).toBe(0);
    });
  });

  describe('重连恢复', () => {
    test('重连后 call 恢复正常', async () => {
      server.register('hello', async (params) => {
        const p = params as { name: string };
        return `Hello ${p.name}!`;
      });

      const r1 = await client.call<string>('hello', { name: 'before' });
      expect(r1).toBe('Hello before!');

      serverTransport.simulateDisconnect(clientTransport);
      await new Promise(r => setTimeout(r, TICK));
      expect(clientTransport.isConnected()).toBe(false);

      await serverTransport.simulateReconnect(clientTransport);
      await new Promise(r => setTimeout(r, TICK));
      expect(clientTransport.isConnected()).toBe(true);

      const r2 = await client.call<string>('hello', { name: 'after' });
      expect(r2).toBe('Hello after!');
    });

    test('重连后重新订阅并收到事件', async () => {
      const events: unknown[] = [];
      const subId = client.subscribe('status', {}, (e) => { events.push(e); });
      await new Promise(r => setTimeout(r, TICK));

      server.emitEvent('status', { v: 1 });
      await new Promise(r => setTimeout(r, TICK));
      expect(events.length).toBe(1);

      serverTransport.simulateDisconnect(clientTransport);
      await new Promise(r => setTimeout(r, TICK));

      client.unsubscribe(subId);

      await serverTransport.simulateReconnect(clientTransport);
      await new Promise(r => setTimeout(r, TICK));

      client.subscribe('status', {}, (e) => { events.push(e); });
      await new Promise(r => setTimeout(r, TICK));

      server.emitEvent('status', { v: 2 });
      await new Promise(r => setTimeout(r, TICK));
      expect(events.length).toBe(2);
    });

    test('重连后并发 call 正常', async () => {
      server.register('add', async (params) => {
        const p = params as { a: number; b: number };
        return p.a + p.b;
      });

      serverTransport.simulateDisconnect(clientTransport);
      await new Promise(r => setTimeout(r, TICK));

      await serverTransport.simulateReconnect(clientTransport);
      await new Promise(r => setTimeout(r, TICK));

      const results = await Promise.all([
        client.call<number>('add', { a: 1, b: 10 }),
        client.call<number>('add', { a: 2, b: 20 }),
        client.call<number>('add', { a: 3, b: 30 }),
      ]);

      expect(results[0]).toBe(11);
      expect(results[1]).toBe(22);
      expect(results[2]).toBe(33);
    });

    test('重连后 call 错误处理正常', async () => {
      server.register('ok', async () => 'ok');
      server.register('err', async () => { throw new Error('boom'); });

      serverTransport.simulateDisconnect(clientTransport);
      await new Promise(r => setTimeout(r, TICK));

      await serverTransport.simulateReconnect(clientTransport);
      await new Promise(r => setTimeout(r, TICK));

      const r1 = await client.call<string>('ok');
      expect(r1).toBe('ok');

      try {
        await client.call('err');
        expect(true).toBe(false);
      } catch (err) {
        expect((err as Error).message).toContain('boom');
      }
    });

    test('重连后大负载正常', async () => {
      server.register('echo', async (params) => params);

      serverTransport.simulateDisconnect(clientTransport);
      await new Promise(r => setTimeout(r, TICK));

      await serverTransport.simulateReconnect(clientTransport);
      await new Promise(r => setTimeout(r, TICK));

      const large = Array.from({ length: 500 }, (_, i) => ({ id: i, data: 'x'.repeat(50) }));
      const result = await client.call('echo', large);
      expect(result).toEqual(large);
    });
  });

  describe('多次断线重连', () => {
    test('连续 3 次断线重连', async () => {
      server.register('ping', async () => 'pong');

      for (let i = 0; i < 3; i++) {
        const before = await client.call<string>('ping');
        expect(before).toBe('pong');

        serverTransport.simulateDisconnect(clientTransport);
        await new Promise(r => setTimeout(r, TICK));
        expect(clientTransport.isConnected()).toBe(false);

        await serverTransport.simulateReconnect(clientTransport);
        await new Promise(r => setTimeout(r, TICK));
        expect(clientTransport.isConnected()).toBe(true);

        const after = await client.call<string>('ping');
        expect(after).toBe('pong');
      }
    });

    test('断线重连期间 subscribe 过滤仍然有效', async () => {
      const events: unknown[] = [];
      const subId = client.subscribe('alert', { level: 'high' }, (e) => { events.push(e); });
      await new Promise(r => setTimeout(r, TICK));

      server.emitEvent('alert', { n: 1 }, { level: 'low' });
      server.emitEvent('alert', { n: 2 }, { level: 'high' });
      await new Promise(r => setTimeout(r, TICK));
      expect(events.length).toBe(1);

      serverTransport.simulateDisconnect(clientTransport);
      await new Promise(r => setTimeout(r, TICK));
      client.unsubscribe(subId);

      await serverTransport.simulateReconnect(clientTransport);
      await new Promise(r => setTimeout(r, TICK));

      client.subscribe('alert', { level: 'high' }, (e) => { events.push(e); });
      await new Promise(r => setTimeout(r, TICK));

      server.emitEvent('alert', { n: 3 }, { level: 'medium' });
      server.emitEvent('alert', { n: 4 }, { level: 'high' });
      await new Promise(r => setTimeout(r, TICK));
      expect(events.length).toBe(2);
      expect((events[1] as RPCEvent).payload).toEqual({ n: 4 });
    });
  });

  describe('混合场景 - 断线重连 + call + subscribe', () => {
    test('call 进行中断线，重连后恢复', async () => {
      server.register('longWork', async () => {
        await new Promise(r => setTimeout(r, 100));
        return { done: true };
      });

      serverTransport.simulateDisconnect(clientTransport);
      await new Promise(r => setTimeout(r, TICK));

      await serverTransport.simulateReconnect(clientTransport);
      await new Promise(r => setTimeout(r, TICK));

      const result = await client.call<{ done: boolean }>('longWork');
      expect(result).toEqual({ done: true });
    });

    test('subscribe 进行中断线，重连后重新订阅并继续收到事件', async () => {
      const events: unknown[] = [];
      const subId = client.subscribe('stream', {}, (e) => { events.push(e); });
      await new Promise(r => setTimeout(r, TICK));

      server.emitEvent('stream', { chunk: 1 });
      await new Promise(r => setTimeout(r, TICK));
      expect(events.length).toBe(1);

      serverTransport.simulateDisconnect(clientTransport);
      await new Promise(r => setTimeout(r, TICK));

      try { await server.emitEvent('stream', { chunk: 2 }); } catch { /* expected */ }
      try { await server.emitEvent('stream', { chunk: 3 }); } catch { /* expected */ }
      await new Promise(r => setTimeout(r, TICK));
      expect(events.length).toBe(1);

      await serverTransport.simulateReconnect(clientTransport);
      await new Promise(r => setTimeout(r, TICK));

      client.unsubscribe(subId);
      client.subscribe('stream', {}, (e) => { events.push(e); });
      await new Promise(r => setTimeout(r, TICK));

      server.emitEvent('stream', { chunk: 4 });
      server.emitEvent('stream', { chunk: 5 });
      await new Promise(r => setTimeout(r, TICK));

      expect(events.length).toBe(3);
      expect((events[1] as RPCEvent).payload).toEqual({ chunk: 4 });
      expect((events[2] as RPCEvent).payload).toEqual({ chunk: 5 });
    });

    test('call + subscribe 同时工作，断线重连后都恢复', async () => {
      const events: unknown[] = [];
      server.register('getData', async () => ({ value: 42 }));
      const subId = client.subscribe('update', {}, (e) => { events.push(e); });
      await new Promise(r => setTimeout(r, TICK));

      const r1 = await client.call<{ value: number }>('getData');
      expect(r1.value).toBe(42);

      server.emitEvent('update', { v: 1 });
      await new Promise(r => setTimeout(r, TICK));
      expect(events.length).toBe(1);

      serverTransport.simulateDisconnect(clientTransport);
      await new Promise(r => setTimeout(r, TICK));

      await serverTransport.simulateReconnect(clientTransport);
      await new Promise(r => setTimeout(r, TICK));

      const r2 = await client.call<{ value: number }>('getData');
      expect(r2.value).toBe(42);

      client.unsubscribe(subId);
      client.subscribe('update', {}, (e) => { events.push(e); });
      await new Promise(r => setTimeout(r, TICK));

      server.emitEvent('update', { v: 2 });
      await new Promise(r => setTimeout(r, TICK));
      expect(events.length).toBe(2);
    });
  });

  describe('负面测试 - 断线重连', () => {
    test('未重连时反复 call 都失败', async () => {
      server.register('test', async () => 'ok');

      serverTransport.simulateDisconnect(clientTransport);
      await new Promise(r => setTimeout(r, TICK));

      const fastClient = new RPCClient({ transport: clientTransport, timeout: 200 });

      for (let i = 0; i < 3; i++) {
        try {
          await fastClient.call('test');
          expect(true).toBe(false);
        } catch (err) {
          expect(err).toBeDefined();
        }
      }

      fastClient.close();
    });

    test('重连后 close 不报错', async () => {
      serverTransport.simulateDisconnect(clientTransport);
      await new Promise(r => setTimeout(r, TICK));

      await serverTransport.simulateReconnect(clientTransport);
      await new Promise(r => setTimeout(r, TICK));

      server.close();
      client.close();
    });
  });
});

describe('SSE Auto Reconnect', () => {
  test('should auto-reconnect when reader loop exits unexpectedly', async () => {
    const pair = await SSETransport.createPair({
      reconnect: true,
      reconnectInterval: 50,
      maxReconnectAttempts: 3,
    });
    const serverT = pair.server as SSETransport;
    const clientT = pair.client as SSETransport;

    expect(clientT.isConnected()).toBe(true);

    serverT.simulateDisconnect(clientT);
    expect(clientT.isConnected()).toBe(false);

    await new Promise((r) => setTimeout(r, 300));

    expect(clientT.isConnected()).toBe(true);

    serverT.close();
    clientT.close();
  });

  test('should use exponential backoff for reconnection', async () => {
    const pair = await SSETransport.createPair({
      reconnect: true,
      reconnectInterval: 30,
      maxReconnectInterval: 500,
      maxReconnectAttempts: 5,
    });
    const serverT = pair.server as SSETransport;
    const clientT = pair.client as SSETransport;

    const delays: number[] = [];
    const origSetTimeout = globalThis.setTimeout;
    const realSetTimeout = origSetTimeout.bind(globalThis);

    (globalThis as any).setTimeout = (fn: (...args: any[]) => void, ms: number, ...args: any[]) => {
      if (ms > 0 && ms <= 500) delays.push(ms);
      return realSetTimeout(fn, ms, ...args);
    };

    serverT.simulateDisconnect(clientT);

    await new Promise((r) => realSetTimeout(r, 600));

    (globalThis as any).setTimeout = origSetTimeout;

    expect(delays.length).toBeGreaterThanOrEqual(2);
    expect(delays[1]).toBeGreaterThan(delays[0]);

    serverT.close();
    clientT.close();
  });

  test('should stop after max reconnect attempts', async () => {
    const pair = await SSETransport.createPair({
      reconnect: true,
      reconnectInterval: 20,
      maxReconnectAttempts: 2,
    });
    const serverT = pair.server as SSETransport;
    const clientT = pair.client as SSETransport;

    (clientT as any).doReconnect = async () => {
      throw new Error('always fails');
    };

    serverT.simulateDisconnect(clientT);

    await new Promise((r) => setTimeout(r, 500));

    const attempts = (clientT as any).reconnectAttempts || 0;
    expect(attempts).toBeLessThanOrEqual(2);

    serverT.close();
    clientT.close();
  });

  test('should clean up reconnect timer on close', async () => {
    const pair = await SSETransport.createPair({
      reconnect: true,
      reconnectInterval: 100,
      maxReconnectAttempts: 10,
    });
    const serverT = pair.server as SSETransport;
    const clientT = pair.client as SSETransport;

    serverT.simulateDisconnect(clientT);
    clientT.close();

    await new Promise((r) => setTimeout(r, 300));

    expect(clientT.isConnected()).toBe(false);
    expect((clientT as any).reconnectTimer).toBeNull();

    serverT.close();
  });

  test('should set isConnected to false on unexpected disconnect (reconnect disabled)', async () => {
    const pair = await SSETransport.createPair({
      reconnect: false,
    });
    const serverT = pair.server as SSETransport;
    const clientT = pair.client as SSETransport;

    expect(clientT.isConnected()).toBe(true);

    serverT.simulateDisconnect(clientT);

    expect(clientT.isConnected()).toBe(false);

    await new Promise((r) => setTimeout(r, 100));
    expect(clientT.isConnected()).toBe(false);

    serverT.close();
    clientT.close();
  });

  test('should reconnect and restore subscription after auto-reconnect', async () => {
    const pair = await SSETransport.createPair({
      reconnect: true,
      reconnectInterval: 50,
      maxReconnectAttempts: 5,
    });
    const serverT = pair.server as SSETransport;
    const clientT = pair.client as SSETransport;
    const srv = new RPCServer(serverT);
    const cli = new RPCClient({ transport: clientT, timeout: 2000 });

    const events: unknown[] = [];
    cli.subscribe('evt', {}, (e) => { events.push(e); });
    await new Promise((r) => setTimeout(r, TICK));

    srv.emitEvent('evt', { v: 1 });
    await new Promise((r) => setTimeout(r, TICK));
    expect(events.length).toBe(1);

    serverT.simulateDisconnect(clientT);
    await new Promise((r) => setTimeout(r, 300));
    expect(clientT.isConnected()).toBe(true);

    srv.emitEvent('evt', { v: 2 });
    await new Promise((r) => setTimeout(r, TICK));
    expect(events.length).toBe(2);

    srv.close();
    cli.close();
  });
});
