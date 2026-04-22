import { createSignal, Signal } from 'solid-js';

export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: number;
}

export interface ResourceInfo {
  type: 'text' | 'binary' | 'large';
  content?: string;
  url?: string;
  path: string;
  size: number;
  mimeType?: string;
}

const TOKEN_KEY = 'pi_agent_token';

const isBrowser = typeof window !== 'undefined';

function getToken(): string {
  if (!isBrowser) return '';
  try { return window.localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
}

function saveToken(t: string) {
  if (!isBrowser) return;
  try { window.localStorage.setItem(TOKEN_KEY, t); } catch { /* */ }
}

function clearToken() {
  if (!isBrowser) return;
  try { window.localStorage.removeItem(TOKEN_KEY); } catch { /* */ }
}

function isDesktop(): boolean {
  if (!isBrowser) return false;
  return !!(window as { __electrobunBunBridge?: unknown }).__electrobunBunBridge;
}

type Setter<T> = (value: T | ((prev: T) => T)) => void;

let _connected: Signal<boolean>;
let _setConnected: Setter<boolean>;
let _transportMode: Signal<'ipc' | 'websocket'>;
let _setTransportMode: Setter<'ipc' | 'websocket'>;
let _authError: Signal<string | null>;
let _setAuthError: Setter<string | null>;

let rpcClient: { call<T>(method: string, params?: unknown): Promise<T>; subscribe(eventType: string, filter: Record<string, unknown>, handler: (event: unknown) => void): string; unsubscribe(subId: string): void; close(): void } | null = null;
let rpcTransport: { close(): void; onMessage(handler: (msg: { type?: string; reason?: string }) => void): void; mode: 'ipc' | 'websocket' } | null = null;

function initSignals() {
  if (_connected) return;
  [_connected, _setConnected] = createSignal(false);
  [_transportMode, _setTransportMode] = createSignal<'ipc' | 'websocket'>('websocket');
  [_authError, _setAuthError] = createSignal<string | null>(null);
}

function connect(token: string): boolean {
  if (!isBrowser) return false;
  initSignals();
  try {
    const PiRPC = (window as { PiRPC?: { BrowserTransport: new (opts: { wsUrl: string; token: string }) => typeof rpcTransport; RPCClient: new (opts: { transport: typeof rpcTransport; timeout: number }) => typeof rpcClient } }).PiRPC;
    if (!PiRPC) {
      _setAuthError('PiRPC not loaded');
      return false;
    }

    let wsUrl = 'ws://' + window.location.host;
    if (window.location.port === '8080' || window.location.port === '') {
      wsUrl = 'ws://localhost:3000';
    }

    rpcTransport = new PiRPC.BrowserTransport({ wsUrl, token });
    rpcTransport.onMessage((msg: { type?: string; reason?: string }) => {
      if (msg && msg.type === 'auth-error') {
        _setAuthError(msg.reason || 'Authentication failed');
        clearToken();
      }
    });

    rpcClient = new PiRPC.RPCClient({
      transport: rpcTransport,
      timeout: 30000,
    });

    _setTransportMode(rpcTransport.mode);
    _setConnected(true);
    saveToken(token);
    _setAuthError(null);
    return true;
  } catch (e) {
    _setAuthError((e as Error).message);
    return false;
  }
}

function disconnect() {
  if (rpcClient) { rpcClient.close(); rpcClient = null; }
  if (rpcTransport) { rpcTransport.close(); rpcTransport = null; }
  initSignals();
  _setConnected(false);
  clearToken();
}

async function call<T>(method: string, params?: unknown): Promise<T> {
  if (!rpcClient) throw new Error('Not connected');
  return rpcClient.call<T>(method, params);
}

async function listDir(path: string): Promise<{ entries: FileEntry[]; basePath: string }> {
  return call('listDir', { path });
}

async function readFile(path: string): Promise<ResourceInfo> {
  return call<ResourceInfo>('readFile', { path });
}

function subscribe(eventType: string, filter: Record<string, unknown>, handler: (event: unknown) => void): string {
  if (!rpcClient) return '';
  return rpcClient.subscribe(eventType, filter, handler);
}

function unsubscribe(subId: string) {
  if (!rpcClient) return;
  rpcClient.unsubscribe(subId);
}

function connected() {
  initSignals();
  return _connected();
}

function transportMode() {
  initSignals();
  return _transportMode();
}

function authError() {
  initSignals();
  return _authError();
}

export const rpc = {
  connected,
  transportMode,
  authError,
  isDesktop,
  getToken,
  saveToken,
  clearToken,
  connect,
  disconnect,
  call,
  listDir,
  readFile,
  subscribe,
  unsubscribe,
};
