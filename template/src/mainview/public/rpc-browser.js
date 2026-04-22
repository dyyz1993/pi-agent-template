(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  function __accessProp(key) {
    return this[key];
  }
  var __toCommonJS = (from) => {
    var entry = (__moduleCache ??= new WeakMap).get(from), desc;
    if (entry)
      return entry;
    entry = __defProp({}, "__esModule", { value: true });
    if (from && typeof from === "object" || typeof from === "function") {
      for (var key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(entry, key))
          __defProp(entry, key, {
            get: __accessProp.bind(from, key),
            enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
          });
    }
    __moduleCache.set(from, entry);
    return entry;
  };
  var __moduleCache;
  var __returnValue = (v) => v;
  function __exportSetter(name, newValue) {
    this[name] = __returnValue.bind(null, newValue);
  }
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, {
        get: all[name],
        enumerable: true,
        configurable: true,
        set: __exportSetter.bind(all, name)
      });
  };

  // packages/rpc-core/src/browser-bundle.ts
  var exports_browser_bundle = {};
  __export(exports_browser_bundle, {
    RPCClient: () => RPCClient,
    InMemoryTransport: () => InMemoryTransport,
    BrowserTransport: () => BrowserTransport
  });

  // packages/rpc-core/src/core/utils.ts
  function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  // packages/rpc-core/src/client.ts
  class RPCClient {
    transport;
    timeout;
    pendingRequests = new Map;
    subscriptions = new Map;
    onError;
    constructor(options) {
      this.transport = options.transport;
      this.timeout = options.timeout || 30000;
      this.onError = options.onError;
      this.setupTransport();
    }
    setupTransport() {
      this.transport.onMessage((message) => {
        this.handleMessage(message);
      });
    }
    handleMessage(message) {
      switch (message.type) {
        case "response":
          this.handleResponse(message);
          break;
        case "event":
          this.handleEvent(message);
          break;
      }
    }
    handleResponse(message) {
      const pending = this.pendingRequests.get(message.id);
      if (!pending)
        return;
      this.pendingRequests.delete(message.id);
      clearTimeout(pending.timer);
      if (message.error) {
        pending.reject(new Error(message.error.message));
      } else {
        pending.resolve(message.result);
      }
    }
    handleEvent(event) {
      for (const [, sub] of this.subscriptions) {
        if (sub.eventType !== event.eventType)
          continue;
        if (this.matchFilter(event, sub.filter)) {
          sub.handler(event);
        }
      }
    }
    matchFilter(event, filter) {
      if (!filter || Object.keys(filter).length === 0)
        return true;
      if (!event.metadata)
        return false;
      for (const key in filter) {
        if (filter[key] !== undefined && filter[key] !== event.metadata[key])
          return false;
      }
      return true;
    }
    async call(method, params) {
      const id = generateId();
      const message = { id, type: "request", method, params };
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout: ${method}`));
        }, this.timeout);
        this.pendingRequests.set(id, {
          resolve: (value) => {
            resolve(value);
          },
          reject,
          timer
        });
        this.transport.send(message).catch((error) => {
          const p = this.pendingRequests.get(id);
          if (p) {
            clearTimeout(p.timer);
            this.pendingRequests.delete(id);
          }
          reject(error);
        });
      });
    }
    subscribe(eventType, filter, handler) {
      const subscriptionId = generateId();
      this.subscriptions.set(subscriptionId, { eventType, filter, handler });
      this.transport.send({ id: subscriptionId, type: "subscribe", eventType, filter }).catch((e) => this.onError?.(e, "subscribe"));
      return subscriptionId;
    }
    unsubscribe(subscriptionId) {
      this.subscriptions.delete(subscriptionId);
      this.transport.send({ id: generateId(), type: "unsubscribe", subscriptionId }).catch((e) => this.onError?.(e, "unsubscribe"));
    }
    close() {
      this.pendingRequests.forEach((p) => {
        clearTimeout(p.timer);
        p.reject(new Error("Client closed"));
      });
      this.pendingRequests.clear();
      this.subscriptions.clear();
      this.transport.close();
    }
    isConnected() {
      return this.transport.isConnected();
    }
  }

  // packages/rpc-core/src/transports/browser.ts
  class BrowserTransport {
    mode;
    ws = null;
    handlers = new Set;
    connected = false;
    wsUrl;
    token;
    reconnectInterval;
    maxReconnectAttempts;
    reconnectAttempts = 0;
    reconnectTimer = null;
    constructor(options) {
      this.wsUrl = options?.wsUrl || "ws://localhost:3000";
      this.token = options?.token;
      this.reconnectInterval = options?.reconnectInterval || 3000;
      this.maxReconnectAttempts = options?.maxReconnectAttempts || 10;
      const isElectrobun = typeof window !== "undefined" && !!window.__electrobunBunBridge;
      this.mode = isElectrobun ? "ipc" : "websocket";
      this.init();
    }
    init() {
      if (this.mode === "ipc") {
        this.initIPC();
      } else {
        this.initWebSocket();
      }
    }
    initIPC() {
      const electrobun = window.__electrobun;
      if (electrobun) {
        electrobun.receiveMessageFromBun = (msg) => {
          this.handleIncoming(msg);
        };
      }
      this.connected = true;
    }
    buildWsUrl() {
      if (!this.token)
        return this.wsUrl;
      const separator = this.wsUrl.includes("?") ? "&" : "?";
      return `${this.wsUrl}${separator}token=${encodeURIComponent(this.token)}`;
    }
    initWebSocket() {
      try {
        const url = this.buildWsUrl();
        this.ws = new globalThis.WebSocket(url);
        this.ws.onopen = () => {
          this.connected = true;
          this.reconnectAttempts = 0;
        };
        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handlers.forEach((h) => h(message));
          } catch {}
        };
        this.ws.onclose = (event) => {
          this.connected = false;
          if (event.code === 4001) {
            this.handlers.forEach((h) => h({ type: "auth-error", code: event.code, reason: event.reason }));
            return;
          }
          this.scheduleReconnect();
        };
        this.ws.onerror = () => {
          this.connected = false;
        };
      } catch {
        this.scheduleReconnect();
      }
    }
    scheduleReconnect() {
      if (this.reconnectAttempts >= this.maxReconnectAttempts)
        return;
      if (this.reconnectTimer)
        clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => {
        this.reconnectAttempts++;
        this.initWebSocket();
      }, this.reconnectInterval);
    }
    handleIncoming(msg) {
      try {
        let message = null;
        if (typeof msg === "string") {
          try {
            message = JSON.parse(msg);
          } catch {
            message = msg;
          }
        } else if (typeof msg === "object" && msg !== null) {
          const m = msg;
          if (m.type === "message" && m.id === "rpc-message") {
            const payload = m.payload;
            if (typeof payload === "string") {
              try {
                message = JSON.parse(payload);
              } catch {
                message = payload;
              }
            } else {
              message = payload;
            }
          } else {
            message = msg;
          }
        }
        if (message !== null) {
          this.handlers.forEach((h) => h(message));
        }
      } catch {}
    }
    getMode() {
      return this.mode;
    }
    setToken(token) {
      this.token = token;
      if (this.mode === "websocket") {
        this.close();
        this.connected = false;
        this.reconnectAttempts = 0;
        this.initWebSocket();
      }
    }
    async send(message) {
      if (this.mode === "ipc") {
        const bridge = window.__electrobunBunBridge;
        if (bridge) {
          const electrobunMsg = {
            type: "message",
            id: "rpc-message",
            payload: message
          };
          bridge.postMessage(JSON.stringify(electrobunMsg));
        }
      } else if (this.ws && this.ws.readyState === globalThis.WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message));
      }
    }
    onMessage(handler) {
      this.handlers.add(handler);
      return () => this.handlers.delete(handler);
    }
    onDisconnect() {
      return () => {};
    }
    close() {
      if (this.reconnectTimer)
        clearTimeout(this.reconnectTimer);
      if (this.ws) {
        this.ws.onclose = null;
        this.ws.close();
        this.ws = null;
      }
      this.handlers.clear();
      this.connected = false;
    }
    isConnected() {
      return this.connected;
    }
  }

  // packages/rpc-core/src/transports/in-memory.ts
  class InMemoryTransport {
    handlers = new Set;
    disconnectHandlers = new Set;
    paired = null;
    connected = true;
    pair(other) {
      this.paired = other;
      other.paired = this;
    }
    async send(message) {
      if (this.paired) {
        this.paired.handlers.forEach((h) => h(message));
      }
    }
    onMessage(handler) {
      this.handlers.add(handler);
      return () => this.handlers.delete(handler);
    }
    onDisconnect(handler) {
      this.disconnectHandlers.add(handler);
      return () => this.disconnectHandlers.delete(handler);
    }
    close() {
      this.handlers.clear();
      this.connected = false;
      this.disconnectHandlers.forEach((h) => h());
      this.disconnectHandlers.clear();
    }
    isConnected() {
      return this.connected;
    }
  }

  // packages/rpc-core/src/browser-bundle.ts
  if (typeof window !== "undefined") {
    window.PiRPC = { RPCClient, BrowserTransport, InMemoryTransport };
  }
})();
