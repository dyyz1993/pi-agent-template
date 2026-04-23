import { useState, useEffect, useCallback } from "react";
import { apiClient } from "./lib/api-client";
import type { RPCMethods } from "./lib/api-client";

type TreeNode = {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  children?: TreeNode[];
  expanded?: boolean;
  loaded?: boolean;
};

type DemoMethod = "system.ping" | "system.hello" | "system.echo";

function App() {
  const [logs, setLogs] = useState<string[]>([]);
  const [method, setMethod] = useState<DemoMethod>("system.ping");
  const [result, setResult] = useState<unknown>(null);
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  const [currentPath, setCurrentPath] = useState(".");
  const [mode, setMode] = useState<"desktop" | "web">("web");
  const [ready, setReady] = useState(false);

  // Subscription state
  const [tickEvents, setTickEvents] = useState<string[]>([]);
  const [tickCount, setTickCount] = useState(0);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);

  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev.slice(-50), `[${time}] ${msg}`]);
  }, []);

  // 初始化 RPC 连接，未连接则全屏 loading
  useEffect(() => {
    const init = async () => {
      try {
        await apiClient.initialize();
        const transport = apiClient.getTransport();
        setMode(transport === "ipc" ? "desktop" : "web");
        addLog(`${transport === "ipc" ? "Desktop" : "Web"} mode - ${transport.toUpperCase()}`);
        setReady(true);
      } catch {
        setTimeout(init, 500);
      }
    };
    init();
  }, [addLog]);

  // --- RPC Calls ---
  const callRPC = async () => {
    addLog(`RPC call: ${method}`);
    try {
      addLog(`Calling: ${method}...`);
      let res: unknown;
      if (method === "system.ping") {
        res = await apiClient.call("system.ping", {});
      } else if (method === "system.hello") {
        res = await apiClient.call("system.hello", {});
      } else {
        res = await apiClient.call("system.echo", {});
      }
      setResult(res);
      addLog(`Result: ${JSON.stringify(res)}`);
    } catch (err) {
      addLog(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // --- Tree Explorer ---
  const entriesToTreeNodes = (entries: RPCMethods["file.listDir"]["result"]["entries"]): TreeNode[] => {
    return entries.map((e) => ({
      name: e.name,
      path: e.path,
      type: e.type,
      size: e.size,
      children: e.type === "directory" ? [] : undefined,
      expanded: false,
      loaded: false,
    }));
  };

  const toggleNode = async (nodePath: string) => {
    const findNode = (nodes: TreeNode[], path: string): TreeNode | null => {
      for (const n of nodes) {
        if (n.path === path) return n;
        if (n.children) {
          const found = findNode(n.children, path);
          if (found) return found;
        }
      }
      return null;
    };

    const updateExpanded = (nodes: TreeNode[], path: string, expanded: boolean): TreeNode[] => {
      return nodes.map((n) => {
        if (n.path === path) return { ...n, expanded };
        if (n.children) return { ...n, children: updateExpanded(n.children, path, expanded) };
        return n;
      });
    };

    const target = findNode(treeNodes, nodePath);
    if (!target) return;

    if (target.expanded) {
      setTreeNodes(updateExpanded(treeNodes, nodePath, false));
    } else if (target.loaded) {
      setTreeNodes(updateExpanded(treeNodes, nodePath, true));
    } else {
      addLog(`ListDir: ${nodePath}`);
      try {
        const res = await apiClient.call("file.listDir", { path: nodePath });
        const children = entriesToTreeNodes(res.entries);
        addLog(`Found ${res.entries.length} items`);

        const loadChildren = (nodes: TreeNode[]): TreeNode[] => {
          return nodes.map((n) => {
            if (n.path === nodePath) return { ...n, children, expanded: true, loaded: true };
            if (n.children) return { ...n, children: loadChildren(n.children) };
            return n;
          });
        };
        setTreeNodes(loadChildren(treeNodes));
      } catch (err) {
        addLog(`Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  };

  const listRootDir = async () => {
    addLog(`ListDir: ${currentPath}`);
    try {
      const res = await apiClient.call("file.listDir", { path: currentPath });
      setTreeNodes(entriesToTreeNodes(res.entries));
      addLog(`Found ${res.entries.length} items`);
    } catch (err) {
      addLog(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // --- Subscriptions ---
  const handleSubscribe = async () => {
    try {
      addLog("Subscribing to tick events...");

      await apiClient.call("timer.start", {});
      setTimerRunning(true);
      addLog("Timer started");

      const subId = await apiClient.subscribe("timer.tick", (payload) => {
        const time = new Date(payload.timestamp).toLocaleTimeString();
        setTickEvents((prev) => [...prev.slice(-19), `#${payload.count} @ ${time}`]);
        setTickCount((c) => c + 1);
      }, {});
      setSubscriptionId(subId);
      addLog(`Subscribed: ${subId}`);
    } catch (err) {
      addLog(`Subscribe error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleUnsubscribe = async () => {
    try {
      if (subscriptionId) {
        apiClient.unsubscribe(subscriptionId);
        setSubscriptionId(null);
        addLog("Unsubscribed");
      }
      await apiClient.call("timer.stop", {});
      setTimerRunning(false);
      addLog("Timer stopped");
    } catch (err) {
      addLog(`Unsubscribe error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // --- Tree Node Renderer ---
  const renderTreeNode = (node: TreeNode, depth: number): React.ReactNode => {
    const isDir = node.type === "directory";
    return (
      <li key={node.path}>
        <div
          className="flex items-center gap-1.5 px-2 py-0.5 text-xs rounded hover:bg-gray-700 cursor-pointer"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => isDir && toggleNode(node.path)}
        >
          {isDir ? (
            <span className="text-yellow-400 text-[10px]">{node.expanded ? "▼" : "▶"}</span>
          ) : (
            <span className="text-gray-500 text-[10px] w-3 inline-block"> </span>
          )}
          <span className="text-gray-400">{isDir ? "📁" : "📄"}</span>
          <span className={isDir ? "text-blue-400" : "text-gray-300"}>{node.name}</span>
        </div>
        {isDir && node.expanded && node.children && (
          <ul>
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  // --- 全屏 Loading（RPC 未连接时） ---
  if (!ready) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mb-4" />
          <div className="text-gray-400 text-sm">Connecting to RPC server...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden">
      <div className="h-8 bg-gray-800 flex items-center px-3 text-xs border-b border-gray-700 flex-shrink-0">
        <span className={`px-2 py-0.5 rounded ${mode === "desktop" ? "bg-green-600" : "bg-blue-600"}`}>
          {mode === "desktop" ? "Desktop (IPC)" : "Web (WebSocket)"}
        </span>
        <span className="ml-3 text-gray-400">Pi Agent</span>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Explorer sidebar */}
        <div className="w-60 bg-gray-850 border-r border-gray-700 flex flex-col flex-shrink-0">
          <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-700">
            Explorer
          </div>
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex gap-2 p-2 border-b border-gray-700">
              <input
                type="text"
                value={currentPath}
                onChange={(e) => setCurrentPath(e.target.value)}
                placeholder="Path"
                className="flex-1 px-2 py-1 text-xs bg-gray-700 rounded text-white border border-gray-600"
              />
              <button
                onClick={listRootDir}
                className="px-2 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 rounded transition-colors"
              >
                List
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-1">
              {treeNodes.length === 0 ? (
                <div className="text-gray-500 text-xs text-center py-4">No files</div>
              ) : (
                <ul className="space-y-0.5">
                  {treeNodes.map((node) => renderTreeNode(node, 0))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex flex-col p-4 overflow-y-auto gap-4">
            {/* RPC Calls */}
            <div className="bg-gray-800 rounded-lg p-4 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold">RPC Calls</h2>
                <div className="flex gap-2">
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as DemoMethod)}
                    className="px-3 py-1 text-xs bg-gray-700 rounded-lg text-white border border-gray-600"
                  >
                    <option value="system.ping">system.ping</option>
                    <option value="system.hello">system.hello</option>
                    <option value="system.echo">system.echo</option>
                  </select>
                  <button
                    onClick={callRPC}
                    className="px-4 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                  >
                    Call
                  </button>
                </div>
              </div>
              {!!result && (
                <div className="bg-gray-700 rounded-lg p-3">
                  <pre className="text-green-400 text-xs overflow-x-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Subscriptions */}
            <div className="bg-gray-800 rounded-lg p-4 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold">
                  Subscriptions
                  {timerRunning && (
                    <span className="ml-2 px-2 py-0.5 bg-green-600/30 text-green-400 rounded text-[10px]">
                      LIVE
                    </span>
                  )}
                </h2>
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-gray-400">
                    {tickCount} events
                  </span>
                  {!subscriptionId ? (
                    <button
                      onClick={handleSubscribe}
                      className="px-4 py-1 text-xs bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                    >
                      Subscribe
                    </button>
                  ) : (
                    <button
                      onClick={handleUnsubscribe}
                      className="px-4 py-1 text-xs bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                    >
                      Unsubscribe
                    </button>
                  )}
                </div>
              </div>
              <div className="bg-gray-700 rounded-lg p-3 max-h-40 overflow-y-auto font-mono text-xs">
                {tickEvents.length === 0 ? (
                  <div className="text-gray-500 text-center py-2">No events yet. Click Subscribe to start.</div>
                ) : (
                  tickEvents.map((ev, i) => (
                    <div key={i} className="text-cyan-400">{ev}</div>
                  ))
                )}
              </div>
            </div>

            {/* Logs */}
            <div className="bg-gray-800 rounded-lg p-4 flex flex-col flex-1 min-h-0">
              <h2 className="text-sm font-semibold mb-3 flex-shrink-0">Logs</h2>
              <div className="flex-1 bg-black rounded-lg p-3 overflow-y-auto font-mono text-xs">
                {logs.map((log, i) => (
                  <div key={i} className={log.includes("Error") ? "text-red-400" : "text-green-400"}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
