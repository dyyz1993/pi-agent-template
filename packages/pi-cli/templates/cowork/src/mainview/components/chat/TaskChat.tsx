/**
 * 任务对话区 — 中间内容面板
 *
 * 显示任务标题 + 用户指令卡片 + AI 回复 + 命令执行卡片 + 回复输入框
 * MVP 阶段使用 mock 数据流
 *
 * V4：聊天消息中出现的 localhost 链接会渲染为可点击的 🌐 标签，
 * 点击后右侧面板自动展开并加载浏览器预览。
 */
import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Plus, ArrowUp, Globe, ExternalLink } from 'lucide-react';
import { useTaskStore } from '../../stores/use-task-store';
import { usePreviewStore } from '../../stores/use-preview-store';
import { useRightPanelStore } from '../../stores/use-sidebar-store';

// ── localhost 链接解析 ──

/** 匹配 localhost / 127.0.0.1 链接（可选协议、必带端口、可选路径） */
const LOCALHOST_RE = /(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)([^\s，。、）)】]*)?/g;

interface LinkSegment {
	type: 'text' | 'link';
	value: string;
}

/**
 * 将文本拆分为「纯文本 / localhost 链接」片段。
 * 仅高亮 localhost / 127.0.0.1 的本地预览地址。
 */
export function splitLocalhostLinks(text: string): LinkSegment[] {
	const segments: LinkSegment[] = [];
	let last = 0;
	// 重置 lastIndex（全局正则复用）
	LOCALHOST_RE.lastIndex = 0;
	let match: RegExpExecArray | null;
	while ((match = LOCALHOST_RE.exec(text)) !== null) {
		const start = match.index;
		if (start > last) segments.push({ type: 'text', value: text.slice(last, start) });
		segments.push({ type: 'link', value: match[0] });
		last = start + match[0].length;
	}
	if (last < text.length) segments.push({ type: 'text', value: text.slice(last) });
	return segments;
}

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
	{
		id: 'msg-5',
		role: 'assistant',
		text: '本地预览服务已启动，访问 http://localhost:7300 即可查看草稿管理界面。',
	},
];

// ── localhost 链接标签 ──
function LocalhostLinkChip({ url }: { url: string }) {
	const openUrl = usePreviewStore((s) => s.openUrl);
	const openForPreview = useRightPanelStore((s) => s.openForPreview);

	const handleClick = () => {
		openForPreview();
		openUrl(url);
	};

	return (
		<button
			onClick={handleClick}
			className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-[13px] font-mono align-middle"
			title={`在右侧打开预览：${url}`}
		>
			<Globe className="w-3 h-3 flex-shrink-0" />
			<span className="truncate max-w-[220px]">{url.replace(/^https?:\/\//, '')}</span>
			<ExternalLink className="w-2.5 h-2.5 flex-shrink-0 opacity-60" />
		</button>
	);
}

/** 渲染可能包含 localhost 链接的文本 */
function RichText({ text }: { text: string }) {
	const segments = splitLocalhostLinks(text);
	const only = segments.length === 1 ? segments[0] : undefined;
	if (only && only.type === 'text') {
		return <>{only.value}</>;
	}
	return (
		<>
			{segments.map((seg, i) =>
				seg.type === 'link' ? (
					<LocalhostLinkChip key={i} url={seg.value} />
				) : (
					<span key={i}>{seg.value}</span>
				),
			)}
		</>
	);
}

// ── 命令执行卡片 ──
function CommandCard({ command, description }: { command: string; description: string }) {
	const [expanded, setExpanded] = useState(true);

	return (
		<div
			className="rounded-xl overflow-hidden my-3 border border-[var(--color-border-primary)]"
			style={{ boxShadow: 'var(--shadow-card)' }}
		>
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
			<div className="mb-6">
				<div
					className="max-w-[90%] px-4 py-3.5 rounded-2xl rounded-tl-md text-[14px] leading-relaxed"
					style={{
						backgroundColor: 'var(--color-cowork-instruction-bg)',
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
						<RichText text={message.text} />
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
			<div className="px-6 py-4 border-b border-[var(--color-border-primary)]">
				<h2 className="text-base font-semibold text-[var(--color-text-primary)] truncate">
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
