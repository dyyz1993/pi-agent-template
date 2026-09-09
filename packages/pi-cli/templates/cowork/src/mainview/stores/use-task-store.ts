/**
 * 任务 Store — 任务 CRUD + 选中态
 */
import { create } from "zustand";
import { apiClient } from "../lib/api-client";
import { useLogStore } from "./use-log-store";

export type TaskStatus = "queued" | "analyzing" | "executing" | "waiting_input" | "review" | "completed" | "failed";

export interface Step {
	label: string;
	status: "pending" | "running" | "done" | "error";
	detail?: string;
}

export interface Task {
	id: string;
	title: string;
	status: TaskStatus;
	progress?: { steps: Step[] };
	createdAt: number;
	updatedAt: number;
}

interface TaskState {
	tasks: Task[];
	currentTaskId: string | null;
	fetchTasks: () => Promise<void>;
	createTask: (title: string) => Promise<Task>;
	selectTask: (id: string) => void;
	updateTask: (id: string, patch: Partial<Pick<Task, "title" | "status" | "progress">>) => Promise<void>;
	deleteTask: (id: string) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
	tasks: [],
	currentTaskId: null,

	fetchTasks: async () => {
		try {
			const res = await apiClient.call("task.list", {});
			set({ tasks: res.tasks });
			// 自动选中第一个任务
			const first = res.tasks[0];
			if (!get().currentTaskId && first) {
				set({ currentTaskId: first.id });
			}
		} catch (err) {
			useLogStore.getState().addLog("error", "Failed to fetch tasks", { error: err });
		}
	},

	createTask: async (title) => {
		const res = await apiClient.call("task.create", { title });
		set((s) => ({ tasks: [res.task, ...s.tasks], currentTaskId: res.task.id }));
		return res.task;
	},

	selectTask: (id) => set({ currentTaskId: id }),

	updateTask: async (id, patch) => {
		try {
			const res = await apiClient.call("task.update", { id, patch });
			set((s) => ({
				tasks: s.tasks.map((t) => (t.id === id ? res.task : t)),
			}));
		} catch (err) {
			useLogStore.getState().addLog("error", "Failed to update task", { error: err });
		}
	},

	deleteTask: async (id) => {
		try {
			await apiClient.call("task.delete", { id });
			set((s) => {
				const tasks = s.tasks.filter((t) => t.id !== id);
				return {
					tasks,
					currentTaskId: s.currentTaskId === id ? (tasks[0]?.id ?? null) : s.currentTaskId,
				};
			});
		} catch (err) {
			useLogStore.getState().addLog("error", "Failed to delete task", { error: err });
		}
	},
}));
