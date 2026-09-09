/**
 * Output 模块 — 产出物管理（Artifacts）
 */

export interface Output {
	id: string;
	name: string;
	kind: "file" | "snippet" | "link";
	path?: string;
	content?: string;
	size?: number;
	taskId?: string;
	createdAt: number;
}

export interface OutputMethods {
	"output.list": { params: {}; result: { outputs: Output[] } };
	"output.add": { params: { name: string; kind: Output["kind"]; path?: string; content?: string; taskId?: string }; result: { output: Output } };
	"output.remove": { params: { id: string }; result: { ok: boolean } };
}
