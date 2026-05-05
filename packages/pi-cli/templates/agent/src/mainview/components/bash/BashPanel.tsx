import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Play, Square, X } from "lucide-react";
import { useBashStore } from "../../stores/use-bash-store";

export function BashPanel() {
  const { t } = useTranslation();
  const [command, setCommand] = useState("");
  const processes = useBashStore((s) => s.processes);
  const activePid = useBashStore((s) => s.activePid);
  const executeCommand = useBashStore((s) => s.executeCommand);
  const killProcess = useBashStore((s) => s.killProcess);
  const setActive = useBashStore((s) => s.setActive);
  const outputRef = useRef<HTMLDivElement>(null);

  const activeProcess = activePid != null ? processes.get(activePid) : null;

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [activeProcess?.output]);

  const handleRun = () => {
    if (!command.trim()) return;
    executeCommand(command.trim());
    setCommand("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleRun();
    }
  };

  const processList = Array.from(processes.entries());

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-700 flex items-center gap-2">
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("bash.enterCommand")}
          className="flex-1 bg-gray-800 text-gray-100 px-3 py-1.5 rounded text-sm font-mono border border-gray-600 focus:border-indigo-500 focus:outline-none"
        />
        <button
          onClick={handleRun}
          disabled={!command.trim()}
          className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded text-sm text-white"
        >
          <Play className="w-3.5 h-3.5" />
          {t("bash.run")}
        </button>
      </div>

      {processList.length > 0 && (
        <div className="flex gap-1 px-3 py-2 border-b border-gray-700 overflow-x-auto">
          {processList.map(([pid, proc]) => (
            <button
              key={pid}
              onClick={() => setActive(pid)}
              className={`group relative flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
                activePid === pid
                  ? proc.running
                    ? "bg-green-900/50 text-green-300 border border-green-700"
                    : "bg-gray-700 text-gray-300 border border-gray-600"
                  : "text-gray-500 bg-gray-800/50 border border-transparent hover:text-gray-300"
              }`}
            >
              {proc.running && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
              )}
              {!proc.running && (
                <span className={`w-2 h-2 rounded-full ${proc.exitCode === 0 ? "bg-green-500" : "bg-red-500"}`} />
              )}
              PID {pid}
              {proc.running && activePid === pid && (
                <button
                  onClick={(e) => { e.stopPropagation(); killProcess(pid); }}
                  className="ml-0.5 text-red-400 hover:text-red-300"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              {!proc.running && (
                <span className={`text-[10px] ${proc.exitCode === 0 ? "text-green-500/70" : "text-red-500/70"}`}>
                  {t("bash.exited", { code: proc.exitCode ?? "?" })}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <div
        ref={outputRef}
        className="flex-1 overflow-auto p-3 font-mono text-xs text-gray-300 bg-gray-950 whitespace-pre-wrap leading-relaxed"
      >
        {activeProcess ? (
          <>
            {activeProcess.running && (
              <div className="flex items-center gap-2 text-yellow-400 mb-2 pb-2 border-b border-gray-800">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500" />
                </span>
                {t("bash.processRunning", { pid: activePid })}
              </div>
            )}
            {activeProcess.output ? (
              activeProcess.output.split("\n").map((line, i) => (
                <div key={i} className="hover:bg-gray-800/30 px-1 -mx-1 rounded">
                  <span className="text-gray-500 select-none mr-2">&gt;</span>
                  <span>{line || "\u00A0"}</span>
                </div>
              ))
            ) : activeProcess.running ? (
              <span className="text-gray-600">{t("bash.waitingOutput")}</span>
            ) : null}
            {!activeProcess.running && activeProcess.exitCode != null && (
              <div className={`mt-2 pt-2 border-t border-gray-800 text-xs font-semibold ${
                activeProcess.exitCode === 0 ? "text-green-400" : "text-red-400"
              }`}>
                {t("bash.exit", { code: activeProcess.exitCode })}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-600">
            <TerminalIcon className="w-12 h-12 mb-3 opacity-30" />
            <span className="text-sm">{t("bash.noActiveProcess")}</span>
            <span className="text-xs mt-1">{t("bash.getStarted")}</span>
          </div>
        )}
      </div>

      {activeProcess?.running && (
        <div className="p-2 border-t border-gray-700 flex justify-end">
          <button
            onClick={() => activePid != null && killProcess(activePid)}
            className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-xs text-white"
          >
            <Square className="w-3 h-3" />
            {t("bash.kill")}
          </button>
        </div>
      )}
    </div>
  );
}

function TerminalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}
