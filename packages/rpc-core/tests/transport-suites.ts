import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { RPCServer, RPCClient } from '../src/index';
import type { Transport } from '../src/index';
import type { RPCEvent } from '../src/index';

export interface TransportFactory {
  (): { server: Transport; client: Transport } | Promise<{ server: Transport; client: Transport }>;
}

const TICK = 50;

export function runTransportSuite(name: string, factory: TransportFactory) {
  describe(`[${name}] Transport 通用测试`, () => {
    let server: RPCServer;
    let client: RPCClient;

    beforeEach(async () => {
      const pair = await factory();
      server = new RPCServer(pair.server);
      client = new RPCClient({ transport: pair.client, timeout: 2000 });
    });

    afterEach(async () => {
      try { server.close(); } catch { /* cleanup */ }
      try { client.close(); } catch { /* cleanup */ }
      await new Promise(r => setTimeout(r, 10));
    });

    describe('基础连接', () => {
      test('transport 连接状态', () => {
        expect(client.isConnected()).toBe(true);
        expect(server).toBeDefined();
      });

      test('close 后 isConnected 返回 false', () => {
        client.close();
        expect(client.isConnected()).toBe(false);
      });
    });

    describe('RPC Call 请求', () => {
      test('基本 call - 返回字符串', async () => {
        server.register('hello', async (params) => {
          const p = params as { name?: string };
          return `Hello ${p?.name || 'World'}!`;
        });

        const result = await client.call<string>('hello', { name: 'Test' });
        expect(result).toBe('Hello Test!');
      });

      test('call - 返回对象', async () => {
        server.register('getUser', async (params) => {
          const p = params as { id: number };
          return { id: p.id, name: 'Alice', age: 30 };
        });

        const result = await client.call<{ id: number; name: string; age: number }>('getUser', { id: 1 });
        expect(result).toEqual({ id: 1, name: 'Alice', age: 30 });
      });

      test('call - 返回数组', async () => {
        server.register('listItems', async () => {
          return [{ id: 1 }, { id: 2 }, { id: 3 }];
        });

        const result = await client.call<{ id: number }[]>('listItems');
        expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
      });

      test('call - echo 原样返回', async () => {
        server.register('echo', async (params) => params);

        const result = await client.call('echo', { data: 42, nested: { a: 'b' } });
        expect(result).toEqual({ data: 42, nested: { a: 'b' } });
      });

      test('call - 无参数调用', async () => {
        server.register('ping', async () => ({ pong: true }));

        const result = await client.call<{ pong: boolean }>('ping');
        expect(result.pong).toBe(true);
      });

      test('call - null 参数', async () => {
        server.register('null-test', async (params) => ({ received: params }));

        const result = await client.call('null-test', null);
        expect(result).toEqual({ received: null });
      });

      test('call - undefined 参数', async () => {
        server.register('undef-test', async (params) => ({ hasParams: params !== undefined }));

        const result = await client.call('undef-test');
        expect(result).toEqual({ hasParams: false });
      });

      test('call - 方法不存在返回错误', async () => {
        try {
          await client.call('nonexistent');
          expect(true).toBe(false);
        } catch (err) {
          expect((err as Error).message).toContain('Method not found');
        }
      });

      test('call - handler 抛错返回内部错误', async () => {
        server.register('fail', async () => {
          throw new Error('something broke');
        });

        try {
          await client.call('fail');
          expect(true).toBe(false);
        } catch (err) {
          expect((err as Error).message).toContain('something broke');
        }
      });

      test('call - 特殊字符方法名', async () => {
        server.register('ns:method-name', async () => 'ok');

        const result = await client.call('ns:method-name');
        expect(result).toBe('ok');
      });

      test('unregister 后方法不存在', async () => {
        server.register('temp', async () => 'ok');
        const result1 = await client.call('temp');
        expect(result1).toBe('ok');

        server.unregister('temp');
        try {
          await client.call('temp');
          expect(true).toBe(false);
        } catch (err) {
          expect((err as Error).message).toContain('Method not found');
        }
      });
    });

    describe('并发调用', () => {
      test('顺序调用 10 次', async () => {
        server.register('add', async (params) => {
          const p = params as { a: number; b: number };
          return p.a + p.b;
        });

        for (let i = 0; i < 10; i++) {
          const result = await client.call<number>('add', { a: i, b: i * 2 });
          expect(result).toBe(i + i * 2);
        }
      });

      test('并发 5 个 call', async () => {
        server.register('delay', async (params) => {
          const p = params as { ms: number };
          await new Promise(r => setTimeout(r, p.ms));
          return { waited: p.ms };
        });

        const results = await Promise.all([
          client.call('delay', { ms: 10 }),
          client.call('delay', { ms: 20 }),
          client.call('delay', { ms: 30 }),
          client.call('delay', { ms: 40 }),
          client.call('delay', { ms: 50 }),
        ]);

        expect(results[0]).toEqual({ waited: 10 });
        expect(results[1]).toEqual({ waited: 20 });
        expect(results[2]).toEqual({ waited: 30 });
        expect(results[3]).toEqual({ waited: 40 });
        expect(results[4]).toEqual({ waited: 50 });
      });

      test('并发 call + 并发错误', async () => {
        server.register('ok', async () => ({ status: 'ok' }));
        server.register('err', async () => { throw new Error('boom'); });

        const results = await Promise.allSettled([
          client.call('ok'),
          client.call('err'),
          client.call('ok'),
          client.call('err'),
        ]);

        expect(results[0].status).toBe('fulfilled');
        expect(results[1].status).toBe('rejected');
        expect(results[2].status).toBe('fulfilled');
        expect(results[3].status).toBe('rejected');
      });
    });

    describe('大负载', () => {
      test('1000 条记录', async () => {
        const largeArray = Array.from({ length: 1000 }, (_, i) => ({ id: i, data: 'x'.repeat(100) }));
        server.register('large', async (params) => params);

        const result = await client.call('large', largeArray);
        expect(result).toEqual(largeArray);
      });

      test('深度嵌套对象', async () => {
        const deep = { a: { b: { c: { d: { e: { f: 'deep' } } } } } };
        server.register('echo', async (params) => params);

        const result = await client.call('echo', deep);
        expect(result).toEqual(deep);
      });
    });

    describe('订阅 - 基础', () => {
      test('订阅并接收事件', async () => {
        const events: unknown[] = [];

        client.subscribe('test-event', (event) => {
          events.push(event);
        });

        await new Promise(r => setTimeout(r, TICK));

        server.emitEvent('test-event', { value: 42 });

        await new Promise(r => setTimeout(r, TICK));

        expect(events.length).toBe(1);
        expect((events[0] as RPCEvent).payload).toEqual({ value: 42 });
        expect((events[0] as RPCEvent).eventType).toBe('test-event');
      });

      test('事件包含 timestamp', async () => {
        const events: unknown[] = [];
        client.subscribe('ts-test', (event) => { events.push(event); });
        await new Promise(r => setTimeout(r, TICK));

        const before = Date.now();
        await server.emitEvent('ts-test', { v: 1 });
        const after = Date.now();
        await new Promise(r => setTimeout(r, TICK));

        expect(events.length).toBe(1);
        const ts = (events[0] as RPCEvent).timestamp;
        expect(ts).toBeGreaterThanOrEqual(before);
        expect(ts).toBeLessThanOrEqual(after);
      });

      test('无订阅者时事件被静默忽略', async () => {
        await server.emitEvent('nobody-listening', { data: 'ignored' });
      });

      test('多次 emit 同一事件', async () => {
        const events: unknown[] = [];
        client.subscribe('multi-emit', (event) => { events.push(event); });
        await new Promise(r => setTimeout(r, TICK));

        for (let i = 0; i < 5; i++) {
          await server.emitEvent('multi-emit', { n: i });
        }
        await new Promise(r => setTimeout(r, TICK));

        expect(events.length).toBe(5);
        for (let i = 0; i < 5; i++) {
          expect((events[i] as RPCEvent).payload).toEqual({ n: i });
        }
      });
    });

    describe('订阅 - 过滤', () => {
      test('filter 匹配 - 只收到匹配的事件', async () => {
        const events: unknown[] = [];

        client.subscribe('filtered', (event) => {
          events.push(event);
        }, { region: 'us' });

        await new Promise(r => setTimeout(r, TICK));

        await server.emitEvent('filtered', { count: 1 }, { region: 'eu' });
        await server.emitEvent('filtered', { count: 2 }, { region: 'us' });
        await server.emitEvent('filtered', { count: 3 }, { region: 'jp' });
        await server.emitEvent('filtered', { count: 4 }, { region: 'us' });

        await new Promise(r => setTimeout(r, TICK));

        expect(events.length).toBe(2);
        expect((events[0] as RPCEvent).payload).toEqual({ count: 2 });
        expect((events[1] as RPCEvent).payload).toEqual({ count: 4 });
      });

      test('filter 多字段匹配', async () => {
        const events: unknown[] = [];

        client.subscribe('multi-filter', (event) => {
          events.push(event);
        }, { type: 'alert', level: 'high' });

        await new Promise(r => setTimeout(r, TICK));

        await server.emitEvent('multi-filter', { msg: 1 }, { type: 'alert', level: 'low' });
        await server.emitEvent('multi-filter', { msg: 2 }, { type: 'alert', level: 'high' });
        await server.emitEvent('multi-filter', { msg: 3 }, { type: 'info', level: 'high' });
        await server.emitEvent('multi-filter', { msg: 4 }, { type: 'alert', level: 'high' });

        await new Promise(r => setTimeout(r, TICK));

        expect(events.length).toBe(2);
        expect((events[0] as RPCEvent).payload).toEqual({ msg: 2 });
        expect((events[1] as RPCEvent).payload).toEqual({ msg: 4 });
      });

      test('空 filter 匹配所有', async () => {
        const events: unknown[] = [];

        client.subscribe('no-filter', (event) => {
          events.push(event);
        });

        await new Promise(r => setTimeout(r, TICK));

        await server.emitEvent('no-filter', { a: 1 }, { region: 'us' });
        await server.emitEvent('no-filter', { a: 2 }, { region: 'eu' });
        await server.emitEvent('no-filter', { a: 3 });

        await new Promise(r => setTimeout(r, TICK));

        expect(events.length).toBe(3);
      });

      test('不同 eventType 互不干扰', async () => {
        const eventsA: unknown[] = [];
        const eventsB: unknown[] = [];

        client.subscribe('type-a', (event) => { eventsA.push(event); });
        client.subscribe('type-b', (event) => { eventsB.push(event); });

        await new Promise(r => setTimeout(r, TICK));

        await server.emitEvent('type-a', { v: 1 });
        await server.emitEvent('type-b', { v: 2 });
        await server.emitEvent('type-a', { v: 3 });

        await new Promise(r => setTimeout(r, TICK));

        expect(eventsA.length).toBe(2);
        expect(eventsB.length).toBe(1);
      });
    });

    describe('订阅 - 取消订阅', () => {
      test('unsubscribe 后不再收到事件', async () => {
        const events: unknown[] = [];

        const subId = client.subscribe('unsub-test', (event) => {
          events.push(event);
        });

        await new Promise(r => setTimeout(r, TICK));

        await server.emitEvent('unsub-test', { n: 1 });
        await new Promise(r => setTimeout(r, TICK));
        expect(events.length).toBe(1);

        client.unsubscribe(subId);

        await server.emitEvent('unsub-test', { n: 2 });
        await new Promise(r => setTimeout(r, TICK));
        expect(events.length).toBe(1);
      });

      test('多个订阅独立取消', async () => {
        const eventsA: unknown[] = [];
        const eventsB: unknown[] = [];

        const subA = client.subscribe('multi-sub', (event) => { eventsA.push(event); }, { tag: 'a' });
        client.subscribe('multi-sub', (event) => { eventsB.push(event); }, { tag: 'b' });

        await new Promise(r => setTimeout(r, TICK));

        await server.emitEvent('multi-sub', { n: 1 }, { tag: 'a' });
        await server.emitEvent('multi-sub', { n: 2 }, { tag: 'b' });
        await new Promise(r => setTimeout(r, TICK));

        expect(eventsA.length).toBe(1);
        expect(eventsB.length).toBe(1);

        client.unsubscribe(subA);

        await server.emitEvent('multi-sub', { n: 3 }, { tag: 'a' });
        await server.emitEvent('multi-sub', { n: 4 }, { tag: 'b' });
        await new Promise(r => setTimeout(r, TICK));

        expect(eventsA.length).toBe(1);
        expect(eventsB.length).toBe(2);
      });

      test('取消不存在的 subscriptionId 无副作用', () => {
        client.unsubscribe('nonexistent-sub-id');
      });
    });

    describe('超时处理', () => {
      test('call 超时 - handler 太慢', async () => {
        const pair = await factory();
        const slowServer = new RPCServer(pair.server);
        const fastClient = new RPCClient({ transport: pair.client, timeout: 100 });

        slowServer.register('slow', async () => {
          await new Promise(r => setTimeout(r, 500));
          return 'too late';
        });

        try {
          await fastClient.call('slow');
          expect(true).toBe(false);
        } catch (err) {
          expect((err as Error).message).toContain('timeout');
        } finally {
          fastClient.close();
          slowServer.close();
        }
      });

      test('call 超时 - 方法不存在（正常超时）', async () => {
        const pair = await factory();
        const s = new RPCServer(pair.server);
        const timeoutClient = new RPCClient({ transport: pair.client, timeout: 100 });

        try {
          await timeoutClient.call('nonexistent');
          expect(true).toBe(false);
        } catch (err) {
          expect(err).toBeDefined();
        } finally {
          timeoutClient.close();
          s.close();
        }
      });

      test('call 超时后不影响后续调用', async () => {
        const pair = await factory();
        const s = new RPCServer(pair.server);
        const c = new RPCClient({ transport: pair.client, timeout: 100 });

        s.register('slow', async () => {
          await new Promise(r => setTimeout(r, 500));
          return 'slow';
        });
        s.register('fast', async () => 'fast');

        try {
          await c.call('slow');
        } catch { /* expected timeout */ }

        const result = await c.call('fast');
        expect(result).toBe('fast');

        c.close();
        s.close();
      });
    });

    describe('混合场景 - call + subscribe 交叉', () => {
      test('call 和 subscribe 同时工作', async () => {
        const events: unknown[] = [];

        server.register('getData', async () => ({ value: 42 }));

        client.subscribe('data-changed', (event) => {
          events.push(event);
        });

        await new Promise(r => setTimeout(r, TICK));

        const result = await client.call<{ value: number }>('getData');
        expect(result.value).toBe(42);

        await server.emitEvent('data-changed', { newValue: 100 });
        await new Promise(r => setTimeout(r, TICK));

        expect(events.length).toBe(1);
        expect((events[0] as RPCEvent).payload).toEqual({ newValue: 100 });
      });

      test('call 期间 emit 事件不干扰', async () => {
        const events: unknown[] = [];

        server.register('longCall', async () => {
          await new Promise(r => setTimeout(r, 50));
          return { done: true };
        });

        client.subscribe('progress', (event) => {
          events.push(event);
        });

        await new Promise(r => setTimeout(r, TICK));

        const callPromise = client.call('longCall');
        await server.emitEvent('progress', { step: 1 });
        await server.emitEvent('progress', { step: 2 });

        const result = await callPromise;
        expect(result).toEqual({ done: true });

        await new Promise(r => setTimeout(r, TICK));
        expect(events.length).toBe(2);
      });

      test('subscribe → call → unsubscribe → call 全流程', async () => {
        const events: unknown[] = [];

        server.register('status', async () => 'active');

        const subId = client.subscribe('status-change', (event) => {
          events.push(event);
        });

        await new Promise(r => setTimeout(r, 50));

        const r1 = await client.call<string>('status');
        expect(r1).toBe('active');

        await server.emitEvent('status-change', { to: 'idle' });
        await new Promise(r => setTimeout(r, 50));
        expect(events.length).toBe(1);

        client.unsubscribe(subId);

        await new Promise(r => setTimeout(r, 50));

        const r2 = await client.call<string>('status');
        expect(r2).toBe('active');

        await server.emitEvent('status-change', { to: 'busy' });
        await new Promise(r => setTimeout(r, 50));
        expect(events.length).toBe(1);
      });
    });

    describe('负面测试', () => {
      test('未连接 transport 的 call 被拒绝', async () => {
        const pair = await factory();
        pair.client.close();

        const disconnectedClient = new RPCClient({ transport: pair.client, timeout: 100 });

        try {
          await disconnectedClient.call('test');
          expect(true).toBe(false);
        } catch (err) {
          expect(err).toBeDefined();
        } finally {
          disconnectedClient.close();
        }
      });

      test('close 后再 close 不报错', () => {
        client.close();
        client.close();
        server.close();
        server.close();
      });

      test('多次 register 同一方法覆盖', async () => {
        server.register('override', async () => 'v1');
        const r1 = await client.call('override');
        expect(r1).toBe('v1');

        server.register('override', async () => 'v2');
        const r2 = await client.call('override');
        expect(r2).toBe('v2');
      });

      test('handler 返回 undefined', async () => {
        server.register('void', async () => undefined);

        const result = await client.call('void');
        expect(result).toBeUndefined();
      });

      test('handler 返回 boolean', async () => {
        server.register('bool', async () => true);

        const result = await client.call('bool');
        expect(result).toBe(true);
      });

      test('handler 返回 number', async () => {
        server.register('num', async () => 42);

        const result = await client.call('num');
        expect(result).toBe(42);
      });

      test('handler 返回空字符串', async () => {
        server.register('empty-str', async () => '');

        const result = await client.call('empty-str');
        expect(result).toBe('');
      });

      test('handler 返回 null', async () => {
        server.register('null-ret', async () => null);

        const result = await client.call('null-ret');
        expect(result).toBeNull();
      });
    });

    describe('close 清理', () => {
      test('client close 清空 pending 和 subscriptions', async () => {
        const pair = await factory();
        const c = new RPCClient({ transport: pair.client });
        c.subscribe('test', () => {});
        c.close();
        expect(c.isConnected()).toBe(false);
      });

      test('server close 清空 handlers 和 subscriptions', async () => {
        const pair = await factory();
        const s = new RPCServer(pair.server);
        s.register('test', async () => 'ok');
        s.close();
      });

      test('server close 后 client call 超时', async () => {
        const pair = await factory();
        const s = new RPCServer(pair.server);
        const c = new RPCClient({ transport: pair.client, timeout: 100 });

        s.register('test', async () => 'ok');
        s.close();

        try {
          await c.call('test');
        } catch (err) {
          expect(err).toBeDefined();
        } finally {
          c.close();
        }
      });
    });
  });
}
