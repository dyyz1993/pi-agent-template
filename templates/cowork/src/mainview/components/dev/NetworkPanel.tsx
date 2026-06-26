/**
 * Network Panel — live RPC/SSE communication feed.
 *
 * - NetworkToggleButton: goes in the TopBar (icon with activity badge).
 * - NetworkDrawer: rendered in AppLayout, shows the live log feed.
 *
 * Data comes from the networkBus (populated by api-client). Solves the
 * "I can't see any network activity" problem with the old silent WebSocket.
 */

import { useState, useEffect, useRef } from "react";
import { Activity, ChevronDown, Trash2 } from "lucide-react";
import { networkBus, type NetworkLogEntry } from "../../lib/network-bus";
import { useNetworkPanelStore } from "../../stores/use-network-panel-store";

const KIND_STYLES: Record<NetworkLogEntry["kind"], { color: string; icon: string }> = {
	request: { color: "var(--color-text-accent)", icon: "→" },
	response: { color: "var(--color-text-success)", icon: "←" },
	event: { color: "var(--color-text-secondary)", icon: "⚡" },
	status: { color: "var(--color-text-tertiary)", icon: "•" },
};

function formatTime(ts: number): string {
	const d = new Date(ts);
	return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}.${String(d.getMilliseconds()).padStart(3, "0").slice(0, 2)}`;
}

/** Toggle button — place in TopBar */
export function NetworkToggleButton() {
	const open = useNetworkPanelStore((s) => s.open);
	const toggle = useNetworkPanelStore((s) => s.toggle);
	const [count, setCount] = useState(0);

	useEffect(() => {
		setCount(networkBus.getEntries().length);
		const unsub = networkBus.subscribe(() => {
			setCount((c) => c + 1);
		});
		return unsub;
	}, []);

	return (
		<button
			onClick={toggle}
			title="网络通讯面板"
			className={`relative text-[var(--color-text-placeholder)] hover:text-[var(--color-text-primary)] transition-colors p-1 rounded hover:bg-[var(--color-bg-hover)] ${
				open ? "text-[var(--color-text-accent)] bg-[var(--color-bg-hover)]" : ""
			}`}
		>
			<Activity className="w-4 h-4" />
			{count > 0 && !open && (
				<span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
			)}
		</button>
	);
}

/** Drawer — place in AppLayout bottom */
export function NetworkDrawer() {
	const open = useNetworkPanelStore((s) => s.open);
	const setOpen = useNetworkPanelStore((s) => s.setOpen);
	const [entries, setEntries] = useState<NetworkLogEntry[]>([]);
	const scrollRef = useRef<HTMLDivElement>(null);
	const autoScroll = useRef(true);

	useEffect(() => {
		setEntries(networkBus.getEntries());
		const unsub = networkBus.subscribe((entry) => {
			setEntries((prev) => [...prev.slice(-199), entry]);
		});
		return unsub;
	}, []);

	useEffect(() => {
		if (!open || !autoScroll.current || !scrollRef.current) return;
		scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
	}, [entries, open]);

	const handleScroll = (): void => {
		if (!scrollRef.current) return;
		const el = scrollRef.current;
		autoScroll.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
	};

	if (!open) return null;

	return (
		<div className="h-56 bg-[var(--color-bg-sidebar)] border-t border-[var(--color-border-primary)] flex flex-col z-30 shadow-lg flex-shrink-0">
			{/* Header */}
			<div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]">
				<div className="flex items-center gap-2 text-xs font-medium">
					<Activity className="w-3 h-3 text-[var(--color-text-accent)]" />
					<span>网络通讯 ({entries.length})</span>
					<span className="text-[var(--color-text-tertiary)] font-normal ml-2">
						POST /api/rpc · SSE /api/events
					</span>
				</div>
				<div className="flex items-center gap-1">
					<button
						onClick={() => setEntries([])}
						title="清空"
						className="text-[var(--color-text-placeholder)] hover:text-[var(--color-text-error)] p-1"
					>
						<Trash2 className="w-3 h-3" />
					</button>
					<button
						onClick={() => setOpen(false)}
						title="收起"
						className="text-[var(--color-text-placeholder)] hover:text-[var(--color-text-primary)] p-1"
					>
						<ChevronDown className="w-3 h-3" />
					</button>
				</div>
			</div>

			{/* Entries */}
			<div
				ref={scrollRef}
				onScroll={handleScroll}
				className="flex-1 overflow-auto font-mono text-[11px] leading-relaxed"
			>
				{entries.length === 0 ? (
					<div className="text-center text-[var(--color-text-tertiary)] py-8">
						等待通讯…发送消息后会在这里看到 RPC 请求和 SSE 事件
					</div>
				) : (
					entries.map((entry) => {
						const style = KIND_STYLES[entry.kind];
						return (
							<div
								key={entry.id}
								className="flex items-start gap-2 px-3 py-0.5 hover:bg-[var(--color-bg-hover)] border-b border-[var(--color-border-secondary)]"
							>
								<span className="text-[var(--color-text-tertiary)] flex-shrink-0">
									{formatTime(entry.time)}
								</span>
								<span style={{ color: style.color }} className="flex-shrink-0 w-4">
									{style.icon}
								</span>
								<span className="text-[var(--color-text-primary)] break-all">
									{entry.label}
									{entry.detail && (
										<span className="text-[var(--color-text-tertiary)] ml-1">
											{entry.detail}
										</span>
									)}
								</span>
							</div>
						);
					})
				)}
			</div>
		</div>
	);
}
