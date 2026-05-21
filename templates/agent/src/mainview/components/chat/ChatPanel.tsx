import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useVirtualizer } from '@tanstack/react-virtual';
import { MessageSquare, Send } from 'lucide-react';
import { useChatStore } from '../../stores/use-chat-store';
import { useInputHistory } from '../../hooks/use-input-history';
import { MessageBubble } from './MessageBubble';

export function ChatPanel() {
	const { t } = useTranslation();
	const messages = useChatStore((s) => s.messages);
	const inputText = useChatStore((s) => s.inputText);
	const setInputText = useChatStore((s) => s.setInputText);
	const sendMessage = useChatStore((s) => s.sendMessage);
	const parentRef = useRef<HTMLDivElement>(null);
	const prevMessageCountRef = useRef(0);
	const { saveToHistory, navigatePrev, navigateNext } = useInputHistory('default');

	const handleSend = useCallback(() => {
		const text = inputText.trim();
		if (!text) return;
		saveToHistory(text);
		sendMessage();
	}, [inputText, saveToHistory, sendMessage]);

	const virtualizer = useVirtualizer({
		count: messages.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => 80,
		overscan: 5,
		measureElement: (element) => element?.getBoundingClientRect().height ?? 80,
	});

	useEffect(() => {
		if (messages.length > prevMessageCountRef.current) {
			virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
		}
		prevMessageCountRef.current = messages.length;
	}, [messages.length, virtualizer]);

	return (
		<div className="flex-1 flex flex-col overflow-hidden relative">
			<div className="px-4 py-2 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border-primary)] flex items-center justify-between flex-shrink-0">
				<h2 className="text-sm font-semibold flex items-center gap-1.5">
					<MessageSquare className="w-4 h-4 text-[var(--color-text-accent)]" />
					{t('chat.title')}
					{messages.length > 0 && (
						<span className="ml-1 px-2 py-0.5 bg-[var(--color-accent)]/30 text-[var(--color-text-accent)] rounded text-[10px]">
							{messages.length}
						</span>
					)}
				</h2>
			</div>

			<div ref={parentRef} className="flex-1 overflow-y-auto">
				{messages.length === 0 ? (
					<div className="flex items-center justify-center h-full text-[var(--color-text-placeholder)] text-sm">
						{t('chat.empty')}
					</div>
				) : (
					<div
						style={{
							height: virtualizer.getTotalSize(),
							width: '100%',
							position: 'relative',
						}}
					>
						{virtualizer.getVirtualItems().map((virtualItem) => {
							const msg = messages[virtualItem.index]!;
							return (
								<div
									key={msg.id}
									data-index={virtualItem.index}
									ref={virtualizer.measureElement}
									style={{
										position: 'absolute',
										top: 0,
										left: 0,
										width: '100%',
										transform: `translateY(${virtualItem.start}px)`,
										padding: '6px 16px',
									}}
								>
									<MessageBubble message={msg} />
								</div>
							);
						})}
					</div>
				)}
			</div>

			<form
				onSubmit={(e) => e.preventDefault()}
				className="px-4 py-3 bg-[var(--color-bg-secondary)] border-t border-[var(--color-border-primary)] flex gap-2 flex-shrink-0"
			>
				<input
					type="text"
					value={inputText}
					onChange={(e) => setInputText(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'Enter' && !e.shiftKey) {
							e.preventDefault();
							handleSend();
						} else if (e.key === 'ArrowUp' && !inputText) {
							e.preventDefault();
							const prev = navigatePrev();
							if (prev !== null) setInputText(prev);
						} else if (e.key === 'ArrowDown') {
							e.preventDefault();
							const next = navigateNext();
							if (next !== null) setInputText(next);
						}
					}}
					placeholder={t('chat.placeholder')}
					className="flex-1 px-3 py-2 text-sm bg-[var(--color-bg-tertiary)] rounded-lg text-[var(--color-text-primary)] border border-[var(--color-border-secondary)] focus:border-[var(--color-accent)] focus:outline-none"
				/>
				<button
					onClick={handleSend}
					className="px-4 py-2 text-sm bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded-lg transition-colors flex items-center gap-1.5"
				>
					<Send className="w-4 h-4" />
					{t('chat.send')}
				</button>
			</form>
		</div>
	);
}
