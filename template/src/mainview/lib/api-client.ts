import { createTypedClient, WebSocketTransport, IPCTransport } from "@chat-agent/rpc-core";
import type { TypedClient, MethodParams, MethodResult, EventPayload, EventMetadata } from "@chat-agent/rpc-core";
import type { RPCMethods, RPCEvents } from "../../shared/rpc-schema";

// Token（与 server.ts 保持一致）
const AUTH_TOKEN = "pi-agent-template-token";

class APIClientImpl {
  private client: TypedClient<RPCMethods, RPCEvents> | null = null;
  private initPromise: Promise<void> | null = null;
  private _transport: "ipc" | "websocket" = "websocket";
  private _baseUrl: string | null = null;
  private wsTransport: WebSocketTransport | null = null;

  /**
   * 桌面端同步初始化：通过 executeJavascript 接收 + __electrobunBunBridge 发送
   */
  initSyncForDesktop(): void {
    if (this.client) return;

    const ipcTransport = new IPCTransport();
    this._transport = "ipc";
    this.client = createTypedClient<RPCMethods, RPCEvents>(ipcTransport);
    this.setupElectrobunBridge(ipcTransport);
    // eslint-disable-next-line no-console
    console.log("[APIClient] Desktop (IPC) initialized synchronously");
  }

  /**
   * 异步初始化：Web 端使用（连接 WebSocket）
   */
  async initialize(): Promise<void> {
    // 已连接且 transport 正常 → 直接返回
    if (this.client && (this._transport === "ipc" || this.wsTransport?.isConnected())) {
      return;
    }

    // client 存在但 WS 断开了 → 清理后重连
    if (this.client && this.wsTransport && !this.wsTransport.isConnected()) {
      this.wsTransport.close();
      this.wsTransport = null;
      this.client = null;
      this.initPromise = null;
    }

    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const env = this.detectEnvironment();

      if (env === "electrobun") {
        // 不应走到这里，桌面端应通过 initSyncForDesktop() 初始化
        this.initSyncForDesktop();
      } else {
        this._transport = "websocket";
        const wsUrl = this.getWebSocketUrl();
        this.wsTransport = new WebSocketTransport(wsUrl);
        await this.wsTransport.connect();
        this.client = createTypedClient<RPCMethods, RPCEvents>(this.wsTransport);

        const wsUrlObj = new URL(wsUrl);
        this._baseUrl = `http://${wsUrlObj.host}`;
      }
    })();

    return this.initPromise;
  }

  private detectEnvironment(): "electrobun" | "browser" {
    if (typeof window === "undefined") return "browser";
    if ((window as unknown as Record<string, unknown>).__electrobunBunBridge) return "electrobun";
    return "browser";
  }

  private getWebSocketUrl(): string {
    if (typeof window === "undefined") return `ws://localhost:3100?token=${AUTH_TOKEN}`;
    return (
      new URLSearchParams(window.location.search).get("ws") ||
      localStorage.getItem("rpc-websocket-url") ||
      `ws://${window.location.hostname}:3100?token=${AUTH_TOKEN}`
    );
  }

  /**
   * 桌面端 IPC 桥接：
   * - Bun → Browser: 通过 executeJavascript 调用 window.__piAgentIPC()
   * - Browser → Bun: 通过 __electrobunBunBridge.postMessage 发送 Electrobun 消息格式
   */
  private setupElectrobunBridge(ipcTransport: IPCTransport): void {
    if (typeof window === "undefined") return;

    const win = window as unknown as Record<string, unknown>;

    // 1. 注册接收函数：Bun 通过 executeJavascript 调用此函数发送消息到 Browser
    win.__piAgentIPC = (msg: unknown) => {
      ipcTransport.simulateMessage(msg);
    };

    // 2. 覆写 send：将 RPC-core 消息包装成 Electrobun 消息格式，通过原生桥接发送
    const bridge = win.__electrobunBunBridge as
      | { postMessage: (msg: string) => void }
      | undefined;

    if (bridge) {
      ipcTransport.send = async (message: unknown) => {
        // 包装成 Electrobun message packet，bun 端 defineRPC 注册了 "rpc-message" handler
        const electrobunPacket = {
          type: "message",
          id: "rpc-message",
          payload: JSON.stringify(message),
        };
        bridge.postMessage(JSON.stringify(electrobunPacket));
      };
    }
  }

  getTransport(): "ipc" | "websocket" {
    return this._transport;
  }

  getBaseUrl(): string | null {
    return this._baseUrl;
  }

  async call<K extends keyof RPCMethods>(
    method: K,
    params: MethodParams<RPCMethods, K>
  ): Promise<MethodResult<RPCMethods, K>> {
    await this.initialize();
    return this.client!.call(method, params);
  }

  async subscribe<K extends keyof RPCEvents>(
    eventType: K,
    handler: (payload: EventPayload<RPCEvents[K]>, metadata: EventMetadata<RPCEvents[K]>) => void,
    filter?: Record<string, unknown>
  ): Promise<string> {
    await this.initialize();
    return this.client!.subscribe(eventType, handler, filter);
  }

  unsubscribe(subscriptionId: string): void {
    this.client?.unsubscribe(subscriptionId);
  }

  isConnected(): boolean {
    return this.client !== null;
  }

  close(): void {
    this.client?.close();
  }
}

export const apiClient = new APIClientImpl();
export type { APIClientImpl, RPCMethods, RPCEvents };
