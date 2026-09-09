/**
 * 元素选择器 — 在 iframe 中选取元素，提取 CSS selector
 *
 * 工作方式：
 * 1. 启用 inspect 模式 → 在 iframe 内容文档添加事件监听
 * 2. hover → 高亮元素；click → 提取 CSS selector
 * 3. 用户可复制 selector 到聊天输入框
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { MousePointer2, Copy, Check } from 'lucide-react';

interface ElementPickerProps {
	iframeRef: React.RefObject<HTMLIFrameElement | null>;
	onElementSelected: (selector: string, tagName: string) => void;
	enabled: boolean;
}

function generateSelector(el: Element): string {
	if (!el || el === document.documentElement) return 'html';
	if (el.id) return `#${CSS.escape(el.id)}`;

	const tag = el.tagName.toLowerCase();
	const parent = el.parentElement;
	if (!parent) return tag;

	const siblings = Array.from(parent.children).filter((c) => c.tagName === el.tagName);
	const path = generateSelector(parent);

	if (siblings.length <= 1) return `${path} > ${tag}`;
	const index = Array.from(parent.children).indexOf(el) + 1;
	return `${path} > ${tag}:nth-child(${index})`;
}

export function ElementPicker({ iframeRef, onElementSelected, enabled }: ElementPickerProps) {
	const [active, setActive] = useState(false);
	const [selectedEl, setSelectedEl] = useState<{ selector: string; tagName: string } | null>(null);
	const [copied, setCopied] = useState(false);

	const highlightRef = useRef<Element | null>(null);
	const activeRef = useRef(false);

	// 用 ref 保存回调，避免事件监听中的闭包陈旧问题
	const onElementSelectedRef = useRef(onElementSelected);
	onElementSelectedRef.current = onElementSelected;

	const removeHighlight = useCallback(() => {
		if (highlightRef.current) {
			(highlightRef.current as HTMLElement).style.outline = '';
			highlightRef.current = null;
		}
	}, []);

	// 用 ref 保存稳定的事件处理函数
	const handleRef = useRef({
		click: null as ((e: MouseEvent) => void) | null,
		over: null as ((e: MouseEvent) => void) | null,
		out: null as ((e: MouseEvent) => void) | null,
	});

	const addListeners = useCallback(
		(doc: Document) => {
			removeHighlight();

			const clickHandler = (e: MouseEvent) => {
				if (!activeRef.current) return;
				e.preventDefault();
				e.stopPropagation();

				const target = e.target as Element;
				if (target === doc.documentElement) return;

				const selector = generateSelector(target);
				const tagName = target.tagName.toLowerCase();

				setSelectedEl({ selector, tagName });
				onElementSelectedRef.current(selector, tagName);

				setActive(false);
				activeRef.current = false;
				removeListeners(doc);
				doc.body.style.cursor = '';
			};

			const overHandler = (e: MouseEvent) => {
				if (!activeRef.current) return;
				const target = e.target as Element;
				if (target === doc.documentElement) return;
				removeHighlight();
				(target as HTMLElement).style.outline = '2px solid #6366f1';
				(target as HTMLElement).style.outlineOffset = '-2px';
				highlightRef.current = target;
			};

			const outHandler = (_e: MouseEvent) => {
				removeHighlight();
			};

			handleRef.current = { click: clickHandler, over: overHandler, out: outHandler };

			doc.addEventListener('click', clickHandler, true);
			doc.addEventListener('mouseover', overHandler, true);
			doc.addEventListener('mouseout', outHandler, true);
			doc.body.style.cursor = 'crosshair';
		},
		[removeHighlight],
	);

	const removeListeners = useCallback((doc: Document) => {
		const { click, over, out } = handleRef.current;
		if (click) doc.removeEventListener('click', click, true);
		if (over) doc.removeEventListener('mouseover', over, true);
		if (out) doc.removeEventListener('mouseout', out, true);
		doc.body.style.cursor = '';
		handleRef.current = { click: null, over: null, out: null };
	}, []);

	const toggleInspect = useCallback(() => {
		const nextActive = !active;
		setActive(nextActive);
		activeRef.current = nextActive;

		if (!nextActive) {
			setSelectedEl(null);
		}

		const iframe = iframeRef.current;
		if (!iframe) return;

		try {
			const doc = iframe.contentDocument || iframe.contentWindow?.document;
			if (!doc) return;

			if (nextActive) {
				addListeners(doc);
			} else {
				removeListeners(doc);
				removeHighlight();
			}
		} catch {
			setActive(false);
			activeRef.current = false;
		}
	}, [active, iframeRef, addListeners, removeListeners, removeHighlight]);

	const handleCopy = useCallback(() => {
		if (!selectedEl) return;
		navigator.clipboard.writeText(selectedEl.selector);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	}, [selectedEl]);

	// 组件卸载时清理
	useEffect(() => {
		return () => {
			const iframe = iframeRef.current;
			if (iframe) {
				try {
					const doc = iframe.contentDocument || iframe.contentWindow?.document;
					if (doc) removeListeners(doc);
				} catch {
					/* ignore */
				}
			}
			removeHighlight();
		};
	}, [iframeRef, removeListeners, removeHighlight]);

	if (!enabled) return null;

	return (
		<div className="border-t border-[var(--color-border-secondary)]">
			<div className="flex items-center gap-1 px-3 py-2">
				<button
					onClick={toggleInspect}
					className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
						active
							? 'bg-[var(--color-accent)] text-white shadow-sm'
							: 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
					}`}
				>
					<MousePointer2 className={`w-3.5 h-3.5 ${active ? 'animate-pulse' : ''}`} />
					{active ? '选取中...' : '选取元素'}
				</button>
			</div>

			{selectedEl && (
				<div className="flex items-center gap-1.5 px-3 pb-2">
					<div className="flex-1 px-2.5 py-1.5 rounded-md bg-[var(--color-bg-tertiary)] font-mono text-xs text-[var(--color-text-accent)] truncate">
						{selectedEl.selector}
					</div>
					<button
						onClick={handleCopy}
						className="p-1.5 rounded-md hover:bg-[var(--color-bg-hover)] transition-colors text-[var(--color-text-tertiary)] hover:text-[var(--color-text-accent)]"
						title="复制选择器"
					>
						{copied ? (
							<Check className="w-3.5 h-3.5 text-green-500" />
						) : (
							<Copy className="w-3.5 h-3.5" />
						)}
					</button>
				</div>
			)}
		</div>
	);
}
