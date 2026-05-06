import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Circle, Clock, CheckCircle2, ListTodo } from "lucide-react";
import { useTodoStore } from "../../stores/use-todo-store";
import type { TodoStatus } from "@shared/modules/todo";

const nextStatus: Record<TodoStatus, TodoStatus> = {
	pending: "in_progress",
	in_progress: "completed",
	completed: "pending",
};

const statusFlow = ["pending", "in_progress", "completed"] as const;

export function TodoPanel() {
	const { t } = useTranslation();
	const [showInput, setShowInput] = useState(false);
	const [input, setInput] = useState("");
	const items = useTodoStore((s) => s.items);
	const fetchItems = useTodoStore((s) => s.fetchItems);
	const addItem = useTodoStore((s) => s.addItem);
	const updateItem = useTodoStore((s) => s.updateItem);
	const removeItem = useTodoStore((s) => s.removeItem);

	useEffect(() => {
		fetchItems();
	}, [fetchItems]);

	const handleAdd = () => {
		if (!input.trim()) return;
		addItem(input.trim());
		setInput("");
		setShowInput(false);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") handleAdd();
		if (e.key === "Escape") setShowInput(false);
	};

	const statusConfig: Record<
		TodoStatus,
		{ icon: typeof Circle; color: string; label: string; circleColor: string }
	> = {
		pending: {
			icon: Circle,
			color: "text-gray-400",
			label: t("todo.statusPending"),
			circleColor: "border-gray-500",
		},
		in_progress: {
			icon: Clock,
			color: "text-yellow-400",
			label: t("todo.statusInProgress"),
			circleColor: "border-yellow-400 bg-yellow-400/20",
		},
		completed: {
			icon: CheckCircle2,
			color: "text-green-400",
			label: t("todo.statusCompleted"),
			circleColor: "border-green-400 bg-green-400/20",
		},
	};

	return (
		<div className="flex flex-col h-full">
			<div className="p-3 border-b border-[var(--color-border-primary)] flex items-center justify-between">
				<span className="text-sm text-[var(--color-text-secondary)]">{t("todo.title")}</span>
				<button
					onClick={() => setShowInput(!showInput)}
					className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded text-[var(--color-text-primary)]"
				>
					<Plus className="w-3 h-3" />
					{t("todo.add")}
				</button>
			</div>

			{showInput && (
				<div className="p-3 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] flex items-center gap-2">
					<input
						type="text"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder={t("todo.placeholder")}
						autoFocus
						className="flex-1 bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)] px-3 py-1.5 rounded text-sm border border-[var(--color-border-secondary)] focus:border-[var(--color-accent)] focus:outline-none"
					/>
					<button
						onClick={handleAdd}
						disabled={!input.trim()}
						className="px-3 py-1 text-xs bg-green-600 hover:bg-green-500 disabled:opacity-40 rounded text-white"
					>
						{t("todo.save")}
					</button>
				</div>
			)}

			<div className="flex-1 overflow-auto p-3">
				{items.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-full text-gray-600">
						<ListTodo className="w-12 h-12 mb-3 opacity-30" />
						<span className="text-sm">{t("todo.empty")}</span>
						<span className="text-xs mt-1">{t("todo.emptyHint")}</span>
					</div>
				) : (
					<div className="space-y-2.5">
						{items.map((item) => {
							const cfg = statusConfig[item.status as TodoStatus];
							const Icon = cfg.icon;
							return (
								<div
									key={item.id}
									className="group relative bg-[var(--color-bg-secondary)]/60 border border-[var(--color-border-primary)]/80 rounded-lg p-3 hover:bg-[var(--color-bg-secondary)] hover:border-[var(--color-border-secondary)] transition-all"
								>
									<div className="flex items-start gap-3">
										<button
											onClick={() => updateItem(item.id, nextStatus[item.status as TodoStatus])}
											className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${cfg.circleColor} ${cfg.color} hover:scale-110`}
										>
											<Icon className="w-3 h-3" />
										</button>
										<div className="flex-1 min-w-0">
											<p
												className={`text-sm leading-relaxed ${
													item.status === "completed"
														? "text-[var(--color-text-placeholder)] line-through"
														: "text-[var(--color-text-secondary)]"
												}`}
											>
												{item.content}
											</p>
											<div className="flex items-center gap-1.5 mt-2 text-[11px] text-[var(--color-text-placeholder)]">
												<span>{t("todo.status")}</span>
												{statusFlow.map((s) => {
													const sc = statusConfig[s];
													const isActive = s === item.status;
													return (
														<span
															key={s}
															className={`inline-flex items-center gap-0.5 ${isActive ? sc.color + " font-medium" : ""}`}
														>
															{isActive && <sc.icon className="w-2.5 h-2.5" />}
															{sc.label}
															{s !== "completed" && (
																<span className="text-gray-700 mx-0.5">&rarr;</span>
															)}
														</span>
													);
												})}
											</div>
										</div>
										<button
											onClick={() => removeItem(item.id)}
											className="text-gray-600 hover:text-[var(--color-text-error)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 self-start mt-0.5"
										>
											<Trash2 className="w-3.5 h-3.5" />
										</button>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
