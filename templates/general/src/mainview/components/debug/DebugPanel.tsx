import { Send, Play, Square, File, ChevronRight, ChevronDown, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../stores/use-app-store";
import { useLogStore } from "../../stores/use-log-store";
import type { DemoMethod } from "../../types";

const COLLAPSED_KEY = "debug-panel-collapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

export function DebugPanel() {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(readCollapsed);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, String(collapsed));
    } catch { /* ignore */ }
  }, [collapsed]);

  const method = useAppStore((s) => s.method);
  const result = useAppStore((s) => s.result);
  const logs = useLogStore((s) => s.logs);
  const tickEvents = useAppStore((s) => s.tickEvents);
  const tickCount = useAppStore((s) => s.tickCount);
  const subscriptionId = useAppStore((s) => s.subscriptionId);
  const timerRunning = useAppStore((s) => s.timerRunning);
  const setMethod = useAppStore((s) => s.setMethod);
  const callRPC = useAppStore((s) => s.callRPC);
  const handleSubscribe = useAppStore((s) => s.handleSubscribe);
  const handleUnsubscribe = useAppStore((s) => s.handleUnsubscribe);
  const clearDebug = useAppStore((s) => s.clearDebug);

  if (collapsed) {
    return (
      <div className="w-12 bg-gray-850 border-l border-gray-700 flex flex-col items-center justify-start pt-2 flex-shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          title="Expand Debug Panel"
          className="w-10 h-6 flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <ChevronRight className="w-3 h-3" />
          {t("tabs.debug")}
        </button>
      </div>
    );
  }

  return (
    <div className="w-72 bg-gray-850 border-l border-gray-700 flex flex-col flex-shrink-0 overflow-y-auto">
      {/* Collapse toggle */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-700">
        <button
          onClick={() => setCollapsed(true)}
          title="Collapse Debug Panel"
          className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-white transition-colors"
        >
          <ChevronDown className="w-3 h-3" />
          {t("tabs.debug")}
        </button>
        <button
          onClick={clearDebug}
          title="Clear all debug data"
          className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          Clear
        </button>
      </div>
      {/* RPC Calls */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5 text-indigo-400" />
            {t("debug.rpcCalls")}
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
            onClick={() => callRPC("")}
            className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 rounded transition-colors flex items-center gap-1"
          >
            <Play className="w-3 h-3" />
            {t("debug.call")}
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
            {t("debug.subscriptions")}
            {timerRunning && (
                <span className="ml-1 px-1.5 py-0.5 bg-green-600/30 text-green-400 rounded text-[10px]">
                  {t("feed.live")}
              </span>
            )}
          </h2>
          <div className="flex gap-2 items-center">
            <span className="text-[11px] text-gray-400">
              {t("debug.events", { count: tickCount })}
            </span>
            {!subscriptionId ? (
              <button
                onClick={handleSubscribe}
                className="px-2 py-0.5 text-xs bg-green-600 hover:bg-green-700 rounded transition-colors"
              >
                {t("debug.subscribe")}
              </button>
            ) : (
              <button
                onClick={handleUnsubscribe}
                className="px-2 py-0.5 text-xs bg-red-600 hover:bg-red-700 rounded transition-colors"
              >
                {t("debug.unsubscribe")}
              </button>
            )}
          </div>
        </div>
        <div className="bg-gray-700 rounded p-2 max-h-32 overflow-y-auto font-mono text-[11px]">
          {tickEvents.length === 0 ? (
            <div className="text-gray-500 text-center py-1">{t("debug.noEvents")}</div>
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
          {t("debug.logs")}
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
  );
}
