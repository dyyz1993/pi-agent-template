/**
 * Task 模块 — 任务管理（Cowork 核心）
 *
 * 替代 session 模块，提供更丰富的任务状态机：
 * queued → analyzing → executing → waiting_input → review → completed / failed
 */

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

export interface TaskMethods {
	"task.list": { params: {}; result: { tasks: Task[] } };
	"task.create": { params: { title: string }; result: { task: Task } };
	"task.get": { params: { id: string }; result: { task: Task | null } };
	"task.update": { params: { id: string; patch: Partial<Pick<Task, "title" | "status" | "progress">> }; result: { task: Task } };
	"task.delete": { params: { id: string }; result: { ok: boolean } };
}
