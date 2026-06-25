/**
 * 文件生成器 — CSV / JSON / Markdown 报告 / ZIP
 *
 * 对应 PRD §4.6 资源管理 — CSV/JSON/MD/ZIP 生成
 */

import { execSync } from "child_process";
import { writeFileSync, unlinkSync, statSync } from "fs";
import { join, dirname } from "path";

// ===== 类型 =====

export interface NoteItem {
	title: string;
	author: string;
	noteUrl: string;
	coverUrl: string;
	likes?: string;
}

export interface Summary {
	noteCount: number;
	imageCount: number;
	successRate: string;
	durationMs: number;
}

// ===== CSV =====

function csvEscape(v: unknown): string {
	if (v === undefined || v === null) return "";
	const s = String(v);
	if (/[",\n\r"]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
	return s;
}

export function toCSV(notes: NoteItem[]): string {
	const headers = ["序号", "标题", "作者", "笔记链接", "封面图链接", "点赞数"];
	const rows = notes.map((n, i) =>
		[i + 1, n.title, n.author, n.noteUrl, n.coverUrl, n.likes || ""]
			.map(csvEscape)
			.join(","),
	);
	return "\ufeff" + [headers.join(","), ...rows].join("\n");
}

// ===== JSON =====

export function toJSON(notes: NoteItem[], meta?: Record<string, unknown>): string {
	return JSON.stringify({ meta: meta || {}, notes }, null, 2);
}

// ===== Markdown 报告 =====

export function toMarkdownReport(
	notes: NoteItem[],
	summary: Summary,
	aiSummary: string,
	pageUrl: string,
): string {
	const lines: string[] = [];
	lines.push("# 采集报告");
	lines.push("");
	lines.push(
		`> 采集时间：${new Date(
			summary.durationMs ? Date.now() - 0 : Date.now(),
		).toLocaleString("zh-CN")}`,
	);
	lines.push(`> 来源页面：${pageUrl}`);
	lines.push("");
	lines.push("## 采集摘要");
	lines.push("");
	lines.push(`- 笔记数量：**${summary.noteCount}** 条`);
	lines.push(`- 图片数量：**${summary.imageCount}** 张`);
	lines.push(`- 下载成功率：**${summary.successRate}**`);
	lines.push("");
	lines.push("## AI 总结");
	lines.push("");
	lines.push(aiSummary || "（AI 总结暂不可用）");
	lines.push("");
	lines.push("## 笔记列表");
	lines.push("");
	notes.forEach((n, i) => {
		lines.push(`### ${i + 1}. ${n.title}`);
		if (n.author) lines.push(`- 作者：${n.author}`);
		if (n.likes) lines.push(`- 点赞：${n.likes}`);
		if (n.noteUrl) lines.push(`- 链接：${n.noteUrl}`);
		if (n.coverUrl) lines.push(`- 封面：${n.coverUrl}`);
		lines.push("");
	});
	return lines.join("\n");
}

// ===== ZIP =====

export function packZip(srcDir: string, outName: string): string {
	const zipPath = join(dirname(srcDir), outName);
	try {
		unlinkSync(zipPath);
	} catch {}
	execSync(`cd "${srcDir}" && zip -rq "${zipPath}" ./`);
	return zipPath;
}

// ===== 文件工具 =====

export function writeFile(dir: string, name: string, data: string | Buffer): { path: string; size: number } {
	const filePath = join(dir, name);
	writeFileSync(filePath, data as any);
	return { path: filePath, size: statSync(filePath).size };
}
