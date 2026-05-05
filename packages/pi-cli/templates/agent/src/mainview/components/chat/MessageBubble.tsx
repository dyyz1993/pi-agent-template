import { memo } from "react";
import { Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Highlight, themes } from "prism-react-renderer";
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

function CodeBlock({ children, className }: { children: string; className?: string }) {
  const language = className?.replace(/language-/, "") || "text";
  return (
    <Highlight theme={themes.nightOwl} code={children.trimEnd()} language={language}>
      {({ style, tokens, getLineProps, getTokenProps }) => (
        <pre
          className="rounded-md p-3 my-2 overflow-x-auto text-xs leading-relaxed"
          style={{ ...style, background: "#1e1e2e" }}
        >
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line })}>
              {line.map((token, key) => (
                <span key={key} {...getTokenProps({ token })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  );
}

export const MessageBubble = memo(function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} items-start gap-2`}>
      {!isUser && (
        <div className="flex-shrink-0 mt-1">
          <Bot className="w-4 h-4 text-[var(--color-text-accent)]" />
        </div>
      )}
      <div
        className={`max-w-[85%] px-3 py-2 rounded-lg text-sm break-words ${
          isUser
            ? "bg-[var(--color-accent)] text-[var(--color-text-primary)]"
            : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]"
        }`}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap">{message.content}</span>
        ) : (
          <div className="markdown-body prose prose-invert prose-sm max-w-none [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-1 [&_h1]:text-base [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mb-1 [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--color-text-accent)] [&_blockquote]:pl-3 [&_blockquote]:text-[var(--color-text-tertiary)] [&_a]:text-[var(--color-text-accent)] [&_a]:underline [&_code:not(pre_code)]:bg-[var(--color-bg-input)] [&_code:not(pre_code)]:px-1 [&_code:not(pre_code)]:rounded [&_code:not(pre_code)]:text-xs [&_table]:border-collapse [&_th]:border [&_th]:border-[var(--color-border-secondary)] [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:border-[var(--color-border-secondary)] [&_td]:px-2 [&_td]:py-1">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children, ...props }) {
                  const isBlock = className?.startsWith("language-") || String(children).includes("\n");
                  if (isBlock) {
                    return <CodeBlock className={className}>{String(children)}</CodeBlock>;
                  }
                  return <code className={className} {...props}>{children}</code>;
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
      {message.timestamp && (
        <span className="text-[10px] text-[var(--color-text-tertiary)] ml-2 flex-shrink-0">
          {formatTime(message.timestamp)}
        </span>
      )}
    </div>
  );
});
