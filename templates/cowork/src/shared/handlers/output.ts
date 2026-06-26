import type { RPCServer } from "@dyyz1993/rpc-core";
import type { MethodParams, MethodResult } from "@dyyz1993/rpc-core";
import type { RPCMethods, HandlerOptions } from "../rpc-schema";
import type { Output } from "../modules/output";

type RegisterFn = <K extends keyof RPCMethods & string>(
	method: K,
	handler: (params: MethodParams<RPCMethods, K>) => Promise<MethodResult<RPCMethods, K>>,
) => void;

// 内存存储
let outputIdCounter = 0;
const outputs: Map<string, Output> = new Map();

// ── Mock 预填充数据 ──
const mockOutputs: Output[] = [
	{
		id: "output-1",
		name: "publish-encouragement.html",
		kind: "file",
		path: "/Users/simon/blog-drafts/publish-encouragement.html",
		size: 3200,
		taskId: "task-1",
		createdAt: Date.now() - 1800000,
	},
];
for (const o of mockOutputs) {
	outputs.set(o.id, o);
	outputIdCounter = Math.max(outputIdCounter, parseInt(o.id.replace("output-", ""), 10));
}

export function register(server: RPCServer, _options: HandlerOptions): void {
	const r: RegisterFn = (method, handler) => {
		server.register(method, handler as (params: unknown) => Promise<unknown>);
	};

	r("output.list", async () => ({
		outputs: [...outputs.values()].sort((a, b) => b.createdAt - a.createdAt),
	}));

	r("output.add", async (params) => {
		const output: Output = {
			id: `output-${++outputIdCounter}`,
			name: params.name,
			kind: params.kind,
			path: params.path,
			content: params.content,
			taskId: params.taskId,
			createdAt: Date.now(),
		};
		outputs.set(output.id, output);
		return { output };
	});

	r("output.remove", async (params) => {
		outputs.delete(params.id);
		return { ok: true };
	});
}
