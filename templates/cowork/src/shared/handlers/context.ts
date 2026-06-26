import type { RPCServer } from "@dyyz1993/rpc-core";
import type { MethodParams, MethodResult } from "@dyyz1993/rpc-core";
import type { RPCMethods, HandlerOptions } from "../rpc-schema";
import type { ContextFolder, Connector, WorkingFile } from "../modules/context";

type RegisterFn = <K extends keyof RPCMethods & string>(
	method: K,
	handler: (params: MethodParams<RPCMethods, K>) => Promise<MethodResult<RPCMethods, K>>,
) => void;

// 内存存储
const folders: ContextFolder[] = [
	{ path: "/Users/simon/blog-drafts", name: "blog-drafts" },
];
const connectors: Connector[] = [
	{ id: "web-search", name: "Web search", type: "web_search", enabled: true },
	{ id: "github-api", name: "GitHub API", type: "api", enabled: false },
];
const workingFiles: WorkingFile[] = [
	{ path: "/Users/simon/blog-drafts/llm-digest-october-2025.md", name: "llm-digest-october-2025.md", size: 12400 },
	{ path: "/Users/simon/blog-drafts/tests-not-optional-coding-agents.md", name: "tests-not-optional-coding-agen...", size: 8200 },
	{ path: "/Users/simon/blog-drafts/digest-november-2025.md", name: "digest-november-2025.md", size: 15600 },
];

export function register(server: RPCServer, _options: HandlerOptions): void {
	const r: RegisterFn = (method, handler) => {
		server.register(method, handler as (params: unknown) => Promise<unknown>);
	};

	r("context.listFolders", async () => ({ folders: [...folders] }));

	r("context.addFolder", async (params) => {
		const folder: ContextFolder = {
			path: params.path,
			name: params.path.split("/").pop() ?? params.path,
		};
		folders.push(folder);
		return { folder };
	});

	r("context.removeFolder", async (params) => {
		const idx = folders.findIndex((f) => f.path === params.path);
		if (idx >= 0) folders.splice(idx, 1);
		return { ok: true };
	});

	r("context.listConnectors", async () => ({ connectors: [...connectors] }));

	r("context.toggleConnector", async (params) => {
		const conn = connectors.find((c) => c.id === params.id);
		if (!conn) throw new Error(`Connector not found: ${params.id}`);
		conn.enabled = params.enabled;
		return { connector: conn };
	});

	r("context.listWorkingFiles", async () => ({ files: [...workingFiles] }));

	r("context.addWorkingFile", async (params) => {
		const file: WorkingFile = {
			path: params.path,
			name: params.path.split("/").pop() ?? params.path,
		};
		workingFiles.push(file);
		return { file };
	});

	r("context.removeWorkingFile", async (params) => {
		const idx = workingFiles.findIndex((f) => f.path === params.path);
		if (idx >= 0) workingFiles.splice(idx, 1);
		return { ok: true };
	});
}
