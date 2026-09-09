/**
 * xbrowser 采集编排 — 通用网页采集流程
 *
 * 使用 xbrowser CLI 操作浏览器（对应 PRD §6.2 Checklist）：
 *   启动浏览器 → 打开页面 → 采集内容 → 下载图片 → 截图 → 生成文件 → 打包 ZIP
 */

import { spawn } from "child_process";
import { statSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { mkdirSync } from "fs";

import {
	toCSV,
	toJSON,
	toMarkdownReport,
	packZip,
	writeFile,
	type NoteItem,
	type Summary,
} from "./generate";
import { XHS_EXTRACT_EXPR } from "./xhs-extract";

const XBROWSER_CMD = process.env.XBROWSER_CMD || "/usr/local/bin/xbrowser";
const CDP_ENDPOINT = process.env.CDP_ENDPOINT || "http://localhost:9221";

export interface ScrapeResult {
	notes: NoteItem[];
	summary: Summary;
	assets: any[];
	steps: { label: string; status: string; detail?: string }[];
}

export type ProgressFn = (steps: { label: string; status: string; detail?: string }[]) => void;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ===== xbrowser CLI 调用 =====

export async function xbrowserCli(args: string[], useCdp = true): Promise<any> {
	const allArgs = useCdp
		? [...args, "--cdp", CDP_ENDPOINT, "--json"]
		: [...args, "--json"];
	return new Promise((resolve, reject) => {
		const child = spawn(XBROWSER_CMD, allArgs, {
			stdio: ["ignore", "pipe", "pipe"],
			env: { ...process.env, NODE_OPTIONS: "" },
		});

		const chunks: Buffer[] = [];
		child.stdout.on("data", (d: Buffer) => chunks.push(d));

		const timeout = setTimeout(() => {
			child.kill("SIGTERM");
			reject(new Error("xbrowser 超时 (75s)"));
		}, 75000);

		child.on("error", (err) => {
			clearTimeout(timeout);
			reject(err);
		});

		child.on("close", () => {
			clearTimeout(timeout);
			const stdout = Buffer.concat(chunks as any).toString("utf8").trim();
			const firstBrace = stdout.indexOf("{");
			const lastBrace = stdout.lastIndexOf("}");
			if (firstBrace >= 0 && lastBrace > firstBrace) {
				const jsonStr = stdout.slice(firstBrace, lastBrace + 1);
				try {
					resolve(JSON.parse(jsonStr));
					return;
				} catch {}
			}
			reject(new Error(`xbrowser 输出解析失败: ${stdout.slice(0, 300)}`));
		});
	});
}

// ===== 下载封面图片 =====

async function downloadCoverImages(
	notes: NoteItem[],
	dir: string,
	sessionId: string,
	taskId: string,
	onProgress: (current: number, total: number, success: number) => void,
): Promise<any[]> {
	const assets: any[] = [];
	const coverUrls = notes.map((n) => n.coverUrl).filter(Boolean);
	if (coverUrls.length === 0) return assets;

	let successCount = 0;
	for (let i = 0; i < coverUrls.length; i++) {
		const url = coverUrls[i];
		if (!url) continue;
		try {
			const response = await fetch(url, {
				headers: {
					Referer: "https://www.xiaohongshu.com/",
					"User-Agent":
						"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
				},
				signal: AbortSignal.timeout(15000),
			} as RequestInit);

			if (!response.ok) throw new Error(`HTTP ${response.status}`);

			const buffer = Buffer.from(await response.arrayBuffer());
			const contentType = response.headers.get("content-type") || "image/webp";
			const ext = contentType.includes("png")
				? "png"
				: contentType.includes("jpeg") || contentType.includes("jpg")
					? "jpg"
					: "webp";
			const name = `xhs-img-${String(i + 1).padStart(3, "0")}.${ext}`;
			const { path: fp, size } = writeFile(dir, name, buffer);

			assets.push({
				id: `ast_${Date.now().toString(36)}${i.toString(36)}`,
				kind: "image",
				name,
				size,
				mime: contentType,
				url,
				path: fp,
				source: {
					pageUrl: "",
					sessionId,
					taskId,
					browserConn: "",
					createdAt: Date.now(),
				},
			});
			successCount++;
		} catch (err: any) {
			assets.push({
				id: `ast_${Date.now().toString(36)}${i.toString(36)}`,
				kind: "image",
				name: `xhs-img-url-${String(i + 1).padStart(3, "0")}.txt`,
				mime: "text/plain",
				url,
				source: {
					pageUrl: "",
					sessionId,
					taskId,
					browserConn: "",
					createdAt: Date.now(),
				},
			});
		}
		onProgress(i + 1, coverUrls.length, successCount);
		if (i < coverUrls.length - 1) await sleep(200);
	}

	return assets;
}

// ===== 会话目录 =====

function sessionDir(sessionId: string): string {
	const dir = join(tmpdir(), "browser-agent-assets", sessionId);
	mkdirSync(dir, { recursive: true });
	return dir;
}

// ===== 采集主流程 =====

export async function scrapeXhs(
	_pluginId: string,
	sessionId: string,
	taskId: string,
	browserConn: string,
	onProgress: ProgressFn,
	opts: {
		url?: string;
		aiSummary?: (prompt: string) => Promise<string>;
	} = {},
): Promise<ScrapeResult> {
	const dir = sessionDir(sessionId);
	const startMs = Date.now();
	const targetUrl = opts.url || "https://www.xiaohongshu.com/explore";

	const steps: { label: string; status: string; detail?: string }[] = [
		{ label: "启动浏览器", status: "pending" },
		{ label: "打开目标页面", status: "pending" },
		{ label: "采集笔记列表", status: "pending" },
		{ label: "下载封面图片", status: "pending" },
		{ label: "截图存档", status: "pending" },
		{ label: "生成 CSV / JSON / 报告", status: "pending" },
		{ label: "打包 ZIP", status: "pending" },
	];

	const step = (i: number, status: string, detail?: string) => {
		steps[i] = { ...steps[i]!, status, detail };
		onProgress(steps);
	};

	let pageUrl = targetUrl;
	let notes: NoteItem[] = [];
	let screenshotAsset: any | undefined;
	let imageAssets: any[] = [];
	let fileAssets: any[] = [];
	let zipAssets: any[] = [];

	try {
		// 1. 检查 xbrowser
		step(0, "running", "使用 xbrowser 引擎...");
		step(0, "done", "xbrowser 就绪");

		// 2. 打开页面 + 截图（链式调用）
		step(1, "running", `正在加载: ${targetUrl}`);
		step(4, "running", "等待页面加载完成后截图...");

		const escapedUrl = targetUrl.replace(/"/g, '\\"');
		const chainCmd = `goto "${escapedUrl}" && screenshot --full-page --base64`;
		const chainResult = await xbrowserCli([chainCmd]);

		if (!chainResult?.success && !chainResult?.steps) {
			const errMsg = chainResult?.data?.error || "页面加载失败";
			step(1, "error", errMsg);
			return {
				notes: [],
				summary: {
					noteCount: 0,
					imageCount: 0,
					successRate: "0%",
					durationMs: Date.now() - startMs,
				},
				assets: [],
				steps,
			};
		}

		const steps0 = chainResult.steps || [];
		let screenshotData: string | null = null;
		for (const s of steps0) {
			if (s.command?.startsWith("screenshot") && s.success && s.data?.data) {
				screenshotData = s.data.data;
			}
		}
		pageUrl = targetUrl;
		step(1, "done", `页面已加载: ${pageUrl}`);

		// 3. 截图存档
		step(4, "running");
		if (screenshotData) {
			const name = `xhs-screenshot-${Date.now()}.png`;
			const { path: fp, size } = writeFile(
				dir,
				name,
				Buffer.from(screenshotData, "base64"),
			);
			screenshotAsset = {
				id: `ast_${Date.now().toString(36)}`,
				kind: "screenshot",
				name,
				size,
				mime: "image/png",
				dataUrl: "data:image/png;base64," + screenshotData.slice(0, 2000),
				path: fp,
				source: {
					pageUrl,
					sessionId,
					taskId,
					browserConn,
					createdAt: Date.now(),
				},
			};
			step(4, "done", "截图完成");
		} else {
			step(4, "error", "截图返回为空");
		}

		// 4. eval 提取数据
		step(2, "running", "执行数据提取...");
		const evalResult = await xbrowserCli(["eval", XHS_EXTRACT_EXPR]);

		if (evalResult?.success && evalResult.data?.result) {
			try {
				const parsed = JSON.parse(evalResult.data.result);
				const raw: any[] = parsed.notes || [];
				notes = raw
					.filter((n: any) => n.noteUrl || n.coverUrl)
					.map((n: any) => ({
						title: n.title || "",
						author: n.author || "",
						noteUrl: n.noteUrl || pageUrl,
						coverUrl: n.coverUrl || "",
						likes: n.likes || "",
					}));
			} catch {}
		}

		if (notes.length === 0) {
			step(2, "error", "未提取到笔记数据");
		} else {
			step(2, "done", `提取到 ${notes.length} 条笔记`);
		}

		// 5. 下载封面图
		step(3, "running");
		const coverUrls = notes.map((n) => n.coverUrl).filter(Boolean);
		if (coverUrls.length > 0) {
			imageAssets = await downloadCoverImages(notes, dir, sessionId, taskId, (current, total, success) => {
				step(3, "running", `下载图片 ${current}/${total}（成功 ${success} 张）`);
			});
			const successCount = imageAssets.filter((a: any) => a.path).length;
			step(3, "done", `图片 ${successCount}/${coverUrls.length} 张已下载`);
		} else {
			step(3, "done", "无封面图可下载");
		}

		// 6. 生成文件
		step(5, "running");

		const csvName = `xhs-notes-${Date.now()}.csv`;
		const { path: csvPath, size: csvSize } = writeFile(dir, csvName, toCSV(notes));
		fileAssets.push({
			id: `ast_${Date.now().toString(36)}`,
			kind: "csv",
			name: csvName,
			size: csvSize,
			mime: "text/csv",
			path: csvPath,
			recordCount: notes.length,
			source: { pageUrl, sessionId, taskId, browserConn, createdAt: Date.now() },
		});

		const jsonName = `xhs-notes-${Date.now()}.json`;
		const { path: jsonPath, size: jsonSize } = writeFile(
			dir,
			jsonName,
			toJSON(notes, { pageUrl, scrapedAt: new Date().toISOString(), count: notes.length }),
		);
		fileAssets.push({
			id: `ast_${Date.now().toString(36)}`,
			kind: "json",
			name: jsonName,
			size: jsonSize,
			mime: "application/json",
			path: jsonPath,
			recordCount: notes.length,
			source: { pageUrl, sessionId, taskId, browserConn, createdAt: Date.now() },
		});

		// AI 报告
		let aiSummaryText = "";
		if (opts.aiSummary) {
			try {
				aiSummaryText = await opts.aiSummary(
					`你采集了小红书页面，共 ${notes.length} 条笔记。\n标题示例：${notes
						.slice(0, 8)
						.map((n) => n.title || "(无标题)")
						.join(" / ")}\n请生成简洁中文报告（不超过 200 字）：1）这批笔记的整体主题 2）3 个值得关注的要点。`,
				);
			} catch {}
		}

		const summary: Summary = {
			noteCount: notes.length,
			imageCount: imageAssets.filter((a: any) => a.path).length,
			successRate:
				coverUrls.length > 0
					? Math.round(
							(imageAssets.filter((a: any) => a.path).length / coverUrls.length) * 100,
						) + "%"
					: "—",
			durationMs: Date.now() - startMs,
		};

		const reportName = `xhs-report-${Date.now()}.md`;
		const { path: reportPath, size: reportSize } = writeFile(
			dir,
			reportName,
			toMarkdownReport(notes, summary, aiSummaryText, pageUrl),
		);
		fileAssets.push({
			id: `ast_${Date.now().toString(36)}`,
			kind: "report",
			name: reportName,
			size: reportSize,
			mime: "text/markdown",
			path: reportPath,
			source: { pageUrl, sessionId, taskId, browserConn, createdAt: Date.now() },
		});
		step(5, "done", "CSV + JSON + 报告已生成");

		// 7. 打包 ZIP
		step(6, "running");
		try {
			const zipPathResult = packZip(dir, `xhs-bundle-${Date.now()}.zip`);
			const zipName = join(dir, zipPathResult).split("/").pop() || "bundle.zip";
			zipAssets.push({
				id: `ast_${Date.now().toString(36)}`,
				kind: "zip",
				name: zipName,
				size: statSync(zipPathResult).size,
				mime: "application/zip",
				path: zipPathResult,
				source: { pageUrl, sessionId, taskId, browserConn, createdAt: Date.now() },
			});
			step(6, "done", "ZIP 打包完成");
		} catch (e: any) {
			step(6, "error", "ZIP 打包失败：" + e.message);
		}

		const assets = [
			...(screenshotAsset ? [screenshotAsset] : []),
			...imageAssets,
			...fileAssets,
			...zipAssets,
		];

		return { notes, summary, assets, steps };
	} catch (e: any) {
		const idx = steps.findIndex((s) => s.status === "pending" || s.status === "running");
		if (idx >= 0) step(idx, "error", e.message);
		return {
			notes: [],
			assets: [],
			summary: { noteCount: 0, imageCount: 0, successRate: "0%", durationMs: Date.now() - startMs },
			steps,
		};
	}
}

// ===== 检测浏览器连接 =====

export async function getOnlineBrowser(
	_pluginId?: string,
): Promise<{ pluginId: string; name: string; tabs: number } | null> {
	try {
		// 用 tab list 验证真实连接 — 能列出 tab 才说明 Chrome 真的连上了
		const result = await xbrowserCli(["tab", "list"]);
		if (result?.success && Array.isArray(result?.data?.tabs)) {
			return {
				pluginId: "xbrowser",
				name: "xbrowser 引擎",
				tabs: result.data.tabs.length,
			};
		}
		return null;
	} catch {
		return null;
	}
}
