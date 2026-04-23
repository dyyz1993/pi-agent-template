import { useState, useEffect, useCallback, useRef } from "react";
import { Highlight, themes } from "prism-react-renderer";
import { apiClient } from "./lib/api-client";
import type { RPCMethods } from "./lib/api-client";
import {
  FolderOpen,
  Folder,
  FileText,
  FileCode,
  Image,
  FileArchive,
  File,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Play,
  Square,
  Send,
  Wifi,
  Monitor,
  MessageSquare,
  X,
} from "lucide-react";

type TreeNode = {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  children?: TreeNode[];
  expanded?: boolean;
  loaded?: boolean;
};

type DemoMethod = "system.ping" | "system.hello" | "system.echo" | "chat.send";

type FilePreview = {
  path: string;
  name: string;
  content: string | null;
  imageUrl: string | null;
  mimeType: string;
  size: number;
  isText: boolean;
  isImage: boolean;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

function getLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "tsx", js: "javascript", jsx: "jsx",
    json: "json", html: "markup", css: "css", md: "markdown",
    py: "python", rs: "rust", go: "go", sh: "bash", bash: "bash",
    yml: "yaml", yaml: "yaml", toml: "toml", xml: "markup",
    sql: "sql", graphql: "graphql",
  };
  return map[ext] || "";
}

function isTextFile(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const textExts = new Set([
    "ts", "tsx", "js", "jsx", "json", "html", "css", "scss", "less",
    "md", "txt", "py", "rs", "go", "sh", "bash", "yml", "yaml", "toml",
    "xml", "sql", "graphql", "env", "gitignore", "prettierrc", "eslintrc",
    "lock", "log", "conf", "cfg", "ini", "csv", "tsv",
  ]);
  return textExts.has(ext);
}

function isImageFile(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return ["png", "jpg", "jpeg", "gif", "svg", "webp", "ico", "bmp"].includes(ext);
}

function getFileIcon(node: TreeNode) {
  if (node.type === "directory") {
    return node.expanded ? (
      <FolderOpen className="w-4 h-4 text-yellow-400 shrink-0" />
    ) : (
      <Folder className="w-4 h-4 text-yellow-400 shrink-0" />
    );
  }
  const ext = node.name.split(".").pop()?.toLowerCase() || "";
  if (["ts", "tsx", "js", "jsx"].includes(ext)) return <FileCode className="w-4 h-4 text-blue-400 shrink-0" />;
  if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)) return <Image className="w-4 h-4 text-green-400 shrink-0" />;
  if (["zip", "gz", "tar", "rar"].includes(ext)) return <FileArchive className="w-4 h-4 text-orange-400 shrink-0" />;
  return <FileText className="w-4 h-4 text-gray-400 shrink-0" />;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const AUTH_TOKEN = "pi-agent-template-token";

function App() {
  const [logs, setLogs] = useState<string[]>([]);
  const [method, setMethod] = useState<DemoMethod>("system.ping");
  const [result, setResult] = useState<unknown>(null);
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  const [currentPath, setCurrentPath] = useState(".");
  const [mode, setMode] = useState<"desktop" | "web">("web");
  const [ready, setReady] = useState(false);

  // File preview
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Subscription state
  const [tickEvents, setTickEvents] = useState<string[]>([]);
  const [tickCount, setTickCount] = useState(0);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);

  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev.slice(-50), `[${time}] ${msg}`]);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize RPC connection
  useEffect(() => {
    const init = async () => {
      try {
        await apiClient.initialize();
        const transport = apiClient.getTransport();
        setMode(transport === "ipc" ? "desktop" : "web");
        addLog(`${transport === "ipc" ? "Desktop" : "Web"} mode - ${transport.toUpperCase()}`);
        setReady(true);

        // Subscribe to chat.message events
        await apiClient.subscribe("chat.message", (payload) => {
          setMessages((prev) => [...prev, {
            id: payload.id,
            role: payload.role,
            content: payload.content,
            timestamp: payload.timestamp,
          }]);
        }, {});
      } catch {
        setTimeout(init, 500);
      }
    };
    init();
  }, [addLog]);

  // Get file content URL (desktop: file://, web: HTTP)
  const getFileUrl = useCallback((filePath: string): string => {
    if (mode === "desktop") {
      return `file://${filePath}`;
    }
    return `http://localhost:3100/file/${encodeURIComponent(filePath)}?token=${AUTH_TOKEN}`;
  }, [mode]);

  // Click file -> load preview
  const openFile = useCallback(async (node: TreeNode) => {
    if (node.type === "directory") return;
    setSelectedPath(node.path);
    setLoadingFile(true);

    const preview: FilePreview = {
      path: node.path,
      name: node.name,
      content: null,
      imageUrl: null,
      mimeType: "",
      size: node.size || 0,
      isText: isTextFile(node.name),
      isImage: isImageFile(node.name),
    };

    try {
      if (preview.isImage) {
        preview.imageUrl = getFileUrl(node.path);
      } else if (preview.isText) {
        const url = getFileUrl(node.path);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        preview.content = await res.text();
        preview.mimeType = res.headers.get("content-type") || "text/plain";
      } else {
        preview.content = `[Binary file: ${node.name} (${formatSize(preview.size)})]`;
        preview.isText = true;
      }
      addLog(`Opened: ${node.name}`);
    } catch (err) {
      preview.content = `Failed to load: ${err instanceof Error ? err.message : String(err)}`;
      preview.isText = true;
      addLog(`Error opening ${node.name}: ${err instanceof Error ? err.message : String(err)}`);
    }

    setFilePreview(preview);
    setLoadingFile(false);
  }, [mode, getFileUrl, addLog]);

  // --- Chat ---
  const sendMessage = async () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText("");
    setMessages((prev) => [...prev, {
      id: `local-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    }]);
    try {
      const res = await apiClient.call("chat.send", { content: text });
      setMessages((prev) => [...prev, {
        id: res.id,
        role: res.role,
        content: res.content,
        timestamp: res.timestamp,
      }]);
    } catch (err) {
      addLog(`Chat error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

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
      } else if (method === "system.echo") {
        res = await apiClient.call("system.echo", {});
      } else if (method === "chat.send") {
        const content = inputText.trim() || "Hello from RPC";
        res = await apiClient.call("chat.send", { content });
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
    const isSelected = selectedPath === node.path;
    return (
      <li key={node.path}>
        <div
          className={`flex items-center gap-1.5 px-2 py-0.5 text-xs rounded cursor-pointer transition-colors ${
            isSelected ? "bg-indigo-600/30 text-white" : "hover:bg-gray-700"
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => isDir ? toggleNode(node.path) : openFile(node)}
        >
          {isDir ? (
            node.expanded ? (
              <ChevronDown className="w-3 h-3 text-gray-500 shrink-0" />
            ) : (
              <ChevronRight className="w-3 h-3 text-gray-500 shrink-0" />
            )
          ) : (
            <span className="w-3 shrink-0" />
          )}
          {getFileIcon(node)}
          <span className={`truncate ${isDir ? "text-blue-300 font-medium" : "text-gray-300"}`}>
            {node.name}
          </span>
        </div>
        {isDir && node.expanded && node.children && (
          <ul>
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  // --- Full-screen Loading ---
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
      {/* Title bar */}
      <div className="h-8 bg-gray-800 flex items-center px-3 text-xs border-b border-gray-700 flex-shrink-0">
        <span className={`px-2 py-0.5 rounded flex items-center gap-1 ${mode === "desktop" ? "bg-green-600" : "bg-blue-600"}`}>
          {mode === "desktop" ? <Monitor className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
          {mode === "desktop" ? "Desktop (IPC)" : "Web (WebSocket)"}
        </span>
        <span className="ml-3 text-gray-400">Pi Agent</span>
      </div>

      {/* Three-column layout */}
      <div className="flex-1 flex overflow-hidden">

        {/* ========== LEFT: Explorer sidebar ========== */}
        <div className="w-60 bg-gray-850 border-r border-gray-700 flex flex-col flex-shrink-0">
          <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-700 flex items-center gap-1.5">
            <Folder className="w-3.5 h-3.5" />
            Explorer
          </div>
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex gap-2 p-2 border-b border-gray-700">
              <input
                type="text"
                value={currentPath}
                onChange={(e) => setCurrentPath(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && listRootDir()}
                placeholder="Path"
                className="flex-1 px-2 py-1 text-xs bg-gray-700 rounded text-white border border-gray-600 focus:border-indigo-500 focus:outline-none"
              />
              <button
                onClick={listRootDir}
                className="px-2 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 rounded transition-colors"
                title="List directory"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-1">
              {treeNodes.length === 0 ? (
                <div className="text-gray-500 text-xs text-center py-4">Enter path and click refresh</div>
              ) : (
                <ul className="space-y-0.5">
                  {treeNodes.map((node) => renderTreeNode(node, 0))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* ========== CENTER: Chat panel ========== */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Chat header */}
          <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              Messages
              {messages.length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-indigo-600/30 text-indigo-300 rounded text-[10px]">
                  {messages.length}
                </span>
              )}
            </h2>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                Start a conversation...
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap break-words ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-700 text-gray-200"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div className="px-4 py-3 bg-gray-800 border-t border-gray-700 flex gap-2 flex-shrink-0">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 text-sm bg-gray-700 rounded-lg text-white border border-gray-600 focus:border-indigo-500 focus:outline-none"
            />
            <button
              onClick={sendMessage}
              className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>

          {/* File preview floating overlay */}
          {filePreview && (
            <div className="absolute inset-0 z-10 bg-gray-900/95 flex flex-col overflow-hidden">
              {/* File header with close button */}
              <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-200">{filePreview.name}</span>
                  {filePreview.size > 0 && (
                    <span className="text-xs text-gray-500">{formatSize(filePreview.size)}</span>
                  )}
                </div>
                <button
                  onClick={() => { setFilePreview(null); setSelectedPath(null); }}
                  className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* File content */}
              <div className="flex-1 overflow-auto">
                {loadingFile ? (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mr-2" />
                    Loading...
                  </div>
                ) : filePreview.isImage && filePreview.imageUrl ? (
                  <div className="flex items-center justify-center h-full p-4 bg-[#1a1a2e]">
                    <img
                      src={filePreview.imageUrl}
                      alt={filePreview.name}
                      className="max-w-full max-h-full object-contain rounded"
                    />
                  </div>
                ) : filePreview.content ? (
                  <Highlight
                    theme={themes.nightOwl}
                    code={filePreview.content}
                    language={getLanguage(filePreview.name)}
                  >
                    {({ className, style, tokens, getLineProps, getTokenProps }) => (
                      <pre
                        className={`${className} text-xs leading-5 p-4 overflow-auto`}
                        style={{ ...style, background: "#011627" }}
                      >
                        {tokens.map((line, i) => (
                          <div key={i} {...getLineProps({ line })} className="flex">
                            <span className="inline-block w-10 text-right pr-4 text-gray-600 select-none shrink-0">
                              {i + 1}
                            </span>
                            <span className="flex-1">
                              {line.map((token, key) => (
                                <span key={key} {...getTokenProps({ token })} />
                              ))}
                            </span>
                          </div>
                        ))}
                      </pre>
                    )}
                  </Highlight>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* ========== RIGHT: Debug panel ========== */}
        <div className="w-72 bg-gray-850 border-l border-gray-700 flex flex-col flex-shrink-0 overflow-y-auto">
          {/* RPC Calls */}
          <div className="p-3 border-b border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-indigo-400" />
                RPC Calls
              </h2>
            </div>
            <div className="flex gap-2 mb-2">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as DemoMethod)}
                className="flex-1 px-2 py-1 text-xs bg-gray-700 rounded text-white border border-gray-600"
              >
                <option value="system.ping">system.ping</option>
                <option value="system.hello">system.hello</option>
                <option value="system.echo">system.echo</option>
                <option value="chat.send">chat.send</option>
              </select>
              <button
                onClick={callRPC}
                className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 rounded transition-colors flex items-center gap-1"
              >
                <Play className="w-3 h-3" />
                Call
              </button>
            </div>
            {!!result && (
              <div className="bg-gray-700 rounded p-2">
                <pre className="text-green-400 text-[11px] overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Subscriptions */}
          <div className="p-3 border-b border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold flex items-center gap-1.5">
                {timerRunning ? (
                  <Square className="w-3.5 h-3.5 text-green-400 fill-green-400" />
                ) : (
                  <Play className="w-3.5 h-3.5 text-gray-400" />
                )}
                Subscriptions
                {timerRunning && (
                  <span className="ml-1 px-1.5 py-0.5 bg-green-600/30 text-green-400 rounded text-[10px]">
                    LIVE
                  </span>
                )}
              </h2>
              <div className="flex gap-2 items-center">
                <span className="text-[11px] text-gray-400">
                  {tickCount} events
                </span>
                {!subscriptionId ? (
                  <button
                    onClick={handleSubscribe}
                    className="px-2 py-0.5 text-xs bg-green-600 hover:bg-green-700 rounded transition-colors"
                  >
                    Subscribe
                  </button>
                ) : (
                  <button
                    onClick={handleUnsubscribe}
                    className="px-2 py-0.5 text-xs bg-red-600 hover:bg-red-700 rounded transition-colors"
                  >
                    Unsubscribe
                  </button>
                )}
              </div>
            </div>
            <div className="bg-gray-700 rounded p-2 max-h-32 overflow-y-auto font-mono text-[11px]">
              {tickEvents.length === 0 ? (
                <div className="text-gray-500 text-center py-1">No events yet</div>
              ) : (
                tickEvents.map((ev, i) => (
                  <div key={i} className="text-cyan-400">{ev}</div>
                ))
              )}
            </div>
          </div>

          {/* Logs */}
          <div className="p-3 flex flex-col flex-1 min-h-0">
            <h2 className="text-xs font-semibold mb-2 flex-shrink-0 flex items-center gap-1.5">
              <File className="w-3.5 h-3.5 text-gray-400" />
              Logs
            </h2>
            <div className="flex-1 bg-black rounded p-2 overflow-y-auto font-mono text-[11px]">
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
  );
}

export default App;
