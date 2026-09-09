import type { RPCServer } from "@dyyz1993/rpc-core";
import type { MethodParams, MethodResult } from "@dyyz1993/rpc-core";
import type { RPCMethods, HandlerOptions } from "../rpc-schema";
import type { Task } from "../modules/task";

type RegisterFn = <K extends keyof RPCMethods & string>(
	method: K,
	handler: (params: MethodParams<RPCMethods, K>) => Promise<MethodResult<RPCMethods, K>>,
) => void;

// 内存存储
let taskIdCounter = 0;
const tasks: Map<string, Task> = new Map();

// ── Mock 预填充数据 ──
function initMockData(): void {
	const now = Date.now();
	const mockTasks: Task[] = [
		{
			id: "task-1",
			title: "Review unpublished drafts for publication",
			status: "executing",
			progress: {
				steps: [
					{ label: "Scan blog-drafts folder", status: "done", detail: "Found 46 draft files" },
					{ label: "Check publication status", status: "done", detail: "Cross-referenced with simonwillison.net" },
					{ label: "Analyze readiness", status: "running", detail: "Reading content of each draft..." },
				],
			},
			createdAt: now - 3600000,
			updatedAt: now - 1800000,
		},
		{
			id: "task-2",
			title: "Summarize latest AI research papers",
			status: "completed",
			progress: {
				steps: [
					{ label: "Search arxiv for recent papers", status: "done", detail: "Found 12 relevant papers" },
					{ label: "Read and summarize", status: "done", detail: "Generated summaries for all papers" },
					{ label: "Compile into digest", status: "done", detail: "Created llm-digest-october-2025.md" },
				],
			},
			createdAt: now - 86400000,
			updatedAt: now - 72000000,
		},
		{
			id: "task-3",
			title: "Generate monthly newsletter",
			status: "queued",
			createdAt: now - 7200000,
			updatedAt: now - 7200000,
		},
	];
	for (const t of mockTasks) {
		tasks.set(t.id, t);
		taskIdCounter = Math.max(taskIdCounter, parseInt(t.id.replace("task-", ""), 10));
	}
}

// 首次加载时填充 mock 数据
initMockData();

export function register(server: RPCServer, _options: HandlerOptions): void {
	const r: RegisterFn = (method, handler) => {
		server.register(method, handler as (params: unknown) => Promise<unknown>);
	};

	r("task.list", async () => ({
		tasks: [...tasks.values()].sort((a, b) => b.updatedAt - a.updatedAt),
	}));

	r("task.create", async (params) => {
		const now = Date.now();
		const task: Task = {
			id: `task-${++taskIdCounter}`,
			title: params.title,
			status: "queued",
			createdAt: now,
			updatedAt: now,
		};
		tasks.set(task.id, task);
		return { task };
	});

	r("task.get", async (params) => ({
		task: tasks.get(params.id) ?? null,
	}));

	r("task.update", async (params) => {
		const task = tasks.get(params.id);
		if (!task) throw new Error(`Task not found: ${params.id}`);
		Object.assign(task, params.patch, { updatedAt: Date.now() });
		return { task };
	});

	r("task.delete", async (params) => {
		tasks.delete(params.id);
		return { ok: true };
	});
}
