import type { RPCServer } from "@dyyz1993/rpc-core";
import type { MethodParams, MethodResult } from "@dyyz1993/rpc-core";
import type { RPCMethods, HandlerOptions } from "../rpc-schema";
import type { TodoItem, TodoStatus } from "../modules/todo";

type RegisterFn = <K extends keyof RPCMethods & string>(
	method: K,
	handler: (params: MethodParams<RPCMethods, K>) => Promise<MethodResult<RPCMethods, K>>
) => void;

export function register(server: RPCServer, _options: HandlerOptions): void {
	const items: TodoItem[] = [];
	let todoIdCounter = 1;

	const r: RegisterFn = (method, handler) => {
		server.register(method, handler as (params: unknown) => Promise<unknown>);
	};

	r("todo.list", async () => ({ items }));

	r("todo.add", async (params) => {
		const item: TodoItem = {
			id: `todo-${todoIdCounter++}`,
			content: params.content,
			status: "pending",
			createdAt: Date.now(),
		};
		items.push(item);
		return { item };
	});

	r("todo.update", async (params) => {
		const item = items.find((i) => i.id === params.id);
		if (!item) throw new Error(`Todo ${params.id} not found`);
		item.status = params.status as TodoStatus;
		return { item };
	});

	r("todo.remove", async (params) => {
		const idx = items.findIndex((i) => i.id === params.id);
		if (idx === -1) return { success: false };
		items.splice(idx, 1);
		return { success: true };
	});
}
