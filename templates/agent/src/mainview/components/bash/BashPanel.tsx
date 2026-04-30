import { useState, useRef, useEffect } from "react";
import { Play, Square } from "lucide-react";
import { useBashStore } from "../../stores/use-bash-store";

export function BashPanel() {
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
          placeholder="Enter command..."
          className="flex-1 bg-gray-800 text-gray-100 px-3 py-1.5 rounded text-sm font-mono border border-gray-600 focus:border-indigo-500 focus:outline-none"
        />
        <button
          onClick={handleRun}
          disabled={!command.trim()}
          className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded text-sm text-white"
        >
          <Play className="w-3.5 h-3.5" />
          Run
        </button>
      </div>

      {processList.length > 1 && (
        <div className="flex gap-1 px-3 py-2 border-b border-gray-700 overflow-x-auto">
          {processList.map(([pid, proc]) => (
            <button
              key={pid}
              onClick={() => setActive(pid)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs whitespace-nowrap ${
                activePid === pid ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${proc.running ? "bg-green-400" : "bg-gray-500"}`} />
              PID {pid}
            </button>
          ))}
        </div>
      )}

      <div
        ref={outputRef}
        className="flex-1 overflow-auto p-3 font-mono text-xs text-gray-300 bg-gray-950 whitespace-pre-wrap"
      >
        {activeProcess ? (
          activeProcess.output || <span className="text-gray-600">Waiting for output...</span>
        ) : (
          <span className="text-gray-600">No active process. Run a command to get started.</span>
        )}
      </div>

      {activeProcess?.running && (
        <div className="p-2 border-t border-gray-700 flex justify-end">
          <button
            onClick={() => activePid != null && killProcess(activePid)}
            className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-xs text-white"
          >
            <Square className="w-3 h-3" />
            Kill
          </button>
        </div>
      )}
    </div>
  );
}
