import type { ChatMessage } from "../../types";

interface MessageBubbleProps {
  message: ChatMessage;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} items-start gap-2`}>
      <div
        className={`max-w-[85%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap break-words ${
          isUser
            ? "bg-indigo-600 text-white"
            : "bg-gray-700 text-gray-200"
        }`}
      >
        {message.content}
      </div>
      {message.timestamp && (
        <span className="text-[10px] text-gray-400 ml-2 flex-shrink-0">
          {formatTime(message.timestamp)}
        </span>
      )}
    </div>
  );
}
