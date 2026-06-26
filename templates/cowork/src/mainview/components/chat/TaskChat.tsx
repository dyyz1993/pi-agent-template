/**
 * 任务对话区 — 中间内容面板
 *
 * 显示任务标题 + 用户指令卡片 + AI 回复 + 命令执行卡片 + 回复输入框
 * MVP 阶段使用 mock 数据流
 */
import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Plus, ArrowUp } from 'lucide-react';
import { useTaskStore } from '../../stores/use-task-store';

// ── Mock 对话数据 ──
interface ChatMessage {
	id: string;
	role: 'user' | 'assistant';
	text?: string;
	command?: { command: string; description: string };
}

const MOCK_MESSAGES: ChatMessage[] = [
	{
		id: 'msg-1',
		role: 'user',
		text: "Look at my drafts that were started within the last three months and then check that I didn't publish them on simonwillison.net using a search against content on that site and then suggest the ones that are most close to being ready",
	},
	{
		id: 'msg-2',
		role: 'assistant',
		text: "I'll help you find drafts from the last three months and check if they've been published. Let me start by looking at your drafts folder.",
	},
	{
		id: 'msg-3',
		role: 'assistant',
		command: {
			command:
				'find /sessions/zealous-bold-ramanujan/mnt/blog-drafts -type f \\( -name "*.md" -o -name "*.txt" -o -name "*.html" \\) -mtime -90 -exec ls -la {} \\;',
			description: 'Find draft files modified in the last 90 days',
		},
	},
	{
		id: 'msg-4',
		role: 'assistant',
		text: "Found 46 draft files. Now let me read the content of each to get their titles/topics, then search simonwillison.net for any matches to check if they've already been published.",
	},
];

// ── 命令执行卡片 ──
function CommandCard({ command, description }: { command: string; description: string }) {
	const [expanded, setExpanded] = useState(true);

	return (
		<div className="rounded-lg overflow-hidden my-3 border border-[var(--color-border-secondary)]">
			<button
				onClick={() => setExpanded(!expanded)}
				className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors text-left"
			>
				{/* 终端图标 */}
				<div className="w-6 h-6 rounded-md bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
					<span className="text-xs">⚙️</span>
				</div>
				<span className="text-sm font-medium text-[var(--color-text-primary)]">
					Running command
				</span>
				<span className="flex-1" />
				{expanded ? (
					<ChevronUp className="w-4 h-4 text-[var(--color-text-tertiary)]" />
				) : (
					<ChevronDown className="w-4 h-4 text-[var(--color-text-tertiary)]" />
				)}
			</button>
			{expanded && (
				<div className="px-4 py-3 bg-[var(--color-bg-primary)] border-t border-[var(--color-border-secondary)]">
					<div className="text-[11px] uppercase tracking-wide text-[var(--color-text-tertiary)] mb-2 font-semibold">
						Request
					</div>
					<pre className="text-[13px] font-mono text-[var(--color-text-secondary)] whitespace-pre-wrap break-all leading-relaxed">
						{JSON.stringify({ command, description }, null, 2)}
					</pre>
				</div>
			)}
		</div>
	);
}

// ── 单条消息 ──
function MessageBubble({ message }: { message: ChatMessage }) {
	if (message.role === 'user') {
		// 用户指令卡片：左对齐，米色背景，无边框
		return (
			<div className="mb-5">
				<div
					className="max-w-[85%] px-4 py-3 rounded-xl rounded-tl-sm text-sm leading-relaxed"
					style={{
						backgroundColor: 'var(--color-cowork-instruction-bg, #f5f0e8)',
						color: 'var(--color-text-primary)',
					}}
				>
					{message.text}
				</div>
			</div>
		);
	}

	// AI 回复：纯文本，左对齐，无背景
	return (
		<div className="mb-5">
			<div className="max-w-[90%]">
				{message.text && (
					<div className="text-sm leading-relaxed text-[var(--color-text-primary)]">
						{message.text}
					</div>
				)}
				{message.command && (
					<CommandCard
						command={message.command.command}
						description={message.command.description}
					/>
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

	const [input, setInput] = useState('');
	const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	const handleSend = () => {
		if (!input.trim()) return;
		setMessages((prev) => [
			...prev,
			{ id: `msg-${Date.now()}`, role: 'user', text: input },
			{
				id: `msg-${Date.now() + 1}`,
				role: 'assistant',
				text: `收到指令："${input}"。正在分析并执行任务...`,
			},
		]);
		setInput('');
	};

	if (!currentTask) {
		return (
			<div className="flex-1 flex items-center justify-center text-[var(--color-text-tertiary)]">
				<div className="text-center">
					<div className="w-16 h-16 rounded-full bg-[var(--color-bg-secondary)] flex items-center justify-center mx-auto mb-4">
						<Plus className="w-7 h-7 text-[var(--color-text-tertiary)]" />
					</div>
					<p className="text-base font-medium text-[var(--color-text-secondary)] mb-1">
						开始一个新任务
					</p>
					<p className="text-sm text-[var(--color-text-tertiary)]">
						在左侧点击 "New task" 或切换 Tab
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex-1 flex flex-col overflow-hidden bg-[var(--color-bg-primary)]">
			{/* 任务标题 */}
			<div className="px-6 py-3.5 border-b border-[var(--color-border-secondary)]">
				<h2 className="text-[15px] font-semibold text-[var(--color-text-primary)] truncate">
					{currentTask.title}
				</h2>
			</div>

			{/* 消息流 */}
			<div className="flex-1 overflow-auto px-6 py-5">
				{messages.map((msg) => (
					<MessageBubble key={msg.id} message={msg} />
				))}
				<div ref={messagesEndRef} />
			</div>

			{/* 底部输入框 */}
			<div className="px-6 pb-4 pt-2">
				<div className="flex items-end gap-2 bg-[var(--color-bg-primary)] rounded-2xl px-3 py-2.5 border border-[var(--color-border-primary)] focus-within:border-[var(--color-text-accent)] transition-colors shadow-sm">
					<button className="p-1.5 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] rounded-lg transition-all">
						<Plus className="w-5 h-5" />
					</button>
					<textarea
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter' && !e.shiftKey) {
								e.preventDefault();
								handleSend();
							}
						}}
						placeholder="Reply..."
						className="flex-1 bg-transparent text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-placeholder)] resize-none outline-none min-h-[24px] max-h-[120px] py-1"
						rows={1}
					/>
					<div className="flex items-center gap-2 pl-1">
						<button className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors px-2 py-1">
							Opus 4.5
						</button>
						{/* 发送按钮：圆形，Claude 风格的橙红色 */}
						<button
							onClick={handleSend}
							disabled={!input.trim()}
							className="w-8 h-8 rounded-full bg-rose-400 text-white disabled:bg-[var(--color-bg-tertiary)] disabled:text-[var(--color-text-tertiary)] hover:bg-rose-500 transition-colors flex items-center justify-center"
						>
							<ArrowUp className="w-4 h-4" strokeWidth={2.5} />
						</button>
					</div>
				</div>
				<p className="text-[11px] text-[var(--color-text-tertiary)] text-center mt-2.5">
					Claude is AI and can make mistakes. Please double-check responses.
				</p>
			</div>
		</div>
	);
}
