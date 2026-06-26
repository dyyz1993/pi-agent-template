/**
 * 任务对话区 — 中间内容面板
 *
 * 显示任务标题 + 用户指令卡片 + AI 回复 + 命令执行卡片 + 回复输入框
 * MVP 阶段使用 mock 数据流
 */
import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Terminal, Send, Plus } from "lucide-react";
import { useTaskStore } from "../../stores/use-task-store";

// ── Mock 对话数据 ──
interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	text?: string;
	command?: { command: string; description: string };
}

const MOCK_MESSAGES: ChatMessage[] = [
	{
		id: "msg-1",
		role: "user",
		text: "Look at my drafts that were started within the last three months and then check that I didn't publish them on simonwillison.net using a search against content on that site and then suggest the ones that are most close to being ready",
	},
	{
		id: "msg-2",
		role: "assistant",
		text: "I'll help you find drafts from the last three months and check if they've been published. Let me start by looking at your drafts folder.",
	},
	{
		id: "msg-3",
		role: "assistant",
		command: {
			command: 'find /sessions/zealous-bold-ramanujan/mnt/blog-drafts -type f \\( -name "*.md" -o -name "*.txt" -o -name "*.html" \\) -mtime -90 -exec ls -la {} \\;',
			description: "Find draft files modified in the last 90 days",
		},
	},
	{
		id: "msg-4",
		role: "assistant",
		text: "Found 46 draft files. Now let me read the content of each to get their titles/topics, then search simonwillison.net for any matches to check if they've already been published.",
	},
];

// ── 命令执行卡片 ──
function CommandCard({ command, description }: { command: string; description: string }) {
	const [expanded, setExpanded] = useState(true);

	return (
		<div className="border border-[var(--color-border-primary)] rounded-lg overflow-hidden my-2">
			<button
				onClick={() => setExpanded(!expanded)}
				className="w-full flex items-center gap-2 px-4 py-2 bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors text-left"
			>
				<Terminal className="w-4 h-4 text-[var(--color-text-accent)]" />
				<span className="text-sm font-medium text-[var(--color-text-primary)]">Running command</span>
				<span className="flex-1" />
				{expanded ? (
					<ChevronUp className="w-4 h-4 text-[var(--color-text-tertiary)]" />
				) : (
					<ChevronDown className="w-4 h-4 text-[var(--color-text-tertiary)]" />
				)}
			</button>
			{expanded && (
				<div className="px-4 py-3 bg-[var(--color-bg-primary)] border-t border-[var(--color-border-secondary)]">
					<div className="text-xs text-[var(--color-text-tertiary)] mb-2">Request</div>
					<pre className="text-sm font-mono text-[var(--color-text-secondary)] whitespace-pre-wrap break-all leading-relaxed">
						{JSON.stringify({ command, description }, null, 2)}
					</pre>
				</div>
			)}
		</div>
	);
}

// ── 单条消息 ──
function MessageBubble({ message }: { message: ChatMessage }) {
	if (message.role === "user") {
		return (
			<div className="flex justify-end mb-4">
				<div className="max-w-[80%] px-5 py-3 rounded-2xl rounded-br-md text-sm leading-relaxed"
					style={{ backgroundColor: "var(--color-cowork-instruction-bg, #f5f0e8)", color: "var(--color-text-primary)" }}
				>
					{message.text}
				</div>
			</div>
		);
	}

	// assistant
	return (
		<div className="flex justify-start mb-4">
			<div className="max-w-[85%]">
				{message.text && (
					<div className="text-sm leading-relaxed text-[var(--color-text-primary)]">
						{message.text}
					</div>
				)}
				{message.command && (
					<CommandCard command={message.command.command} description={message.command.description} />
				)}
			</div>
		</div>
	);
}

// ── 主组件 ──
export function TaskChat() {
	const currentTaskId = useTaskStore((s) => s.currentTaskId);
	const tasks = useTaskStore((s) => s.tasks);
	const currentTask = tasks.find((t) => t.id === currentTaskId);

	const [input, setInput] = useState("");
	const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	const handleSend = () => {
		if (!input.trim()) return;
		setMessages((prev) => [
			...prev,
			{ id: `msg-${Date.now()}`, role: "user", text: input },
			{
				id: `msg-${Date.now() + 1}`,
				role: "assistant",
				text: `收到指令："${input}"。正在分析并执行任务...`,
			},
		]);
		setInput("");
	};

	if (!currentTask) {
		return (
			<div className="flex-1 flex items-center justify-center text-[var(--color-text-tertiary)]">
				<div className="text-center">
					<p className="text-lg mb-2">选择或创建一个任务</p>
					<p className="text-sm">在左侧任务栏点击 "New task" 开始</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex-1 flex flex-col overflow-hidden">
			{/* 任务标题 */}
			<div className="px-6 py-3 border-b border-[var(--color-border-secondary)]">
				<h2 className="text-sm font-medium text-[var(--color-text-primary)] truncate">
					{currentTask.title}
				</h2>
			</div>

			{/* 消息流 */}
			<div className="flex-1 overflow-auto px-6 py-4">
				{messages.map((msg) => (
					<MessageBubble key={msg.id} message={msg} />
				))}
				<div ref={messagesEndRef} />
			</div>

			{/* 底部输入框 */}
			<div className="px-6 py-4 border-t border-[var(--color-border-secondary)]">
				<div className="flex items-end gap-2 bg-[var(--color-bg-secondary)] rounded-xl px-4 py-3 border border-[var(--color-border-primary)] focus-within:border-[var(--color-text-accent)] transition-colors">
					<button className="p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors">
						<Plus className="w-5 h-5" />
					</button>
					<textarea
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								handleSend();
							}
						}}
						placeholder="Reply..."
						className="flex-1 bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-placeholder)] resize-none outline-none min-h-[24px] max-h-[120px]"
						rows={1}
					/>
					<div className="flex items-center gap-2">
						<span className="text-xs text-[var(--color-text-tertiary)]">Opus 4.5</span>
						<button
							onClick={handleSend}
							disabled={!input.trim()}
							className="p-1.5 rounded-lg bg-[var(--color-accent)] text-white disabled:opacity-40 hover:bg-[var(--color-accent-hover)] transition-colors"
						>
							<Send className="w-4 h-4" />
						</button>
					</div>
				</div>
				<p className="text-xs text-[var(--color-text-tertiary)] text-center mt-2">
					Claude is AI and can make mistakes. Please double-check responses.
				</p>
			</div>
		</div>
	);
}
