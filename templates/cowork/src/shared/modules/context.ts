/**
 * Context 模块 — 上下文管理（文件夹 / 连接器 / 工作文件）
 */

export interface ContextFolder {
	path: string;
	name: string;
}

export interface Connector {
	id: string;
	name: string;
	type: "web_search" | "api" | "database";
	enabled: boolean;
}

export interface WorkingFile {
	path: string;
	name: string;
	size?: number;
}

export interface ContextMethods {
	"context.listFolders": { params: {}; result: { folders: ContextFolder[] } };
	"context.addFolder": { params: { path: string }; result: { folder: ContextFolder } };
	"context.removeFolder": { params: { path: string }; result: { ok: boolean } };
	"context.listConnectors": { params: {}; result: { connectors: Connector[] } };
	"context.toggleConnector": { params: { id: string; enabled: boolean }; result: { connector: Connector } };
	"context.listWorkingFiles": { params: {}; result: { files: WorkingFile[] } };
	"context.addWorkingFile": { params: { path: string }; result: { file: WorkingFile } };
	"context.removeWorkingFile": { params: { path: string }; result: { ok: boolean } };
}
