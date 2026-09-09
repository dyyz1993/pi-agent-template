import { describe, test, expect, afterAll } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { detectTemplateMeta } from "../commands/update";
import { postProcessTemplate } from "../lib/copy";

const TMP_DIRS: string[] = [];

afterAll(() => {
	for (const d of TMP_DIRS) {
		if (existsSync(d)) rmSync(d, { recursive: true, force: true });
	}
});

function makeTmp(prefix = "pi-update-test-"): string {
	const d = mkdtempSync(join(tmpdir(), prefix));
	TMP_DIRS.push(d);
	return d;
}

function makeProject(name: string, modules: string[]): string {
	const dir = makeTmp();
	writeFileSync(join(dir, "package.json"), JSON.stringify({ name, version: "1.0.0" }, null, "\t"));
	const modulesDir = join(dir, "src", "shared", "modules");
	mkdirSync(modulesDir, { recursive: true });
	for (const m of modules) {
		mkdirSync(join(modulesDir, m), { recursive: true });
	}
	return dir;
}

describe("detectTemplateMeta", () => {
	test("agent: bash + todo + rules", () => {
		const dir = makeProject("my-agent", ["bash", "todo", "rules", "chat"]);
		expect(detectTemplateMeta(dir)?.templateType).toBe("agent");
	});

	test("browser-agent: browser module", () => {
		const dir = makeProject("my-browser", ["browser", "chat"]);
		expect(detectTemplateMeta(dir)?.templateType).toBe("browser-agent");
	});

	test("cowork: task + context + output", () => {
		const dir = makeProject("my-cowork", ["task", "context", "output"]);
		expect(detectTemplateMeta(dir)?.templateType).toBe("cowork");
	});

	test("chat: chat without file/git", () => {
		const dir = makeProject("my-chat", ["chat"]);
		expect(detectTemplateMeta(dir)?.templateType).toBe("chat");
	});

	test("general: everything else", () => {
		const dir = makeProject("my-general", ["chat", "file", "git"]);
		expect(detectTemplateMeta(dir)?.templateType).toBe("general");
	});

	test("returns project name from package.json", () => {
		const dir = makeProject("custom-name", ["chat"]);
		expect(detectTemplateMeta(dir)?.projectName).toBe("custom-name");
	});

	test("null when no modules dir", () => {
		const dir = makeTmp();
		writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "x" }));
		expect(detectTemplateMeta(dir)).toBeNull();
	});
});

describe("postProcessTemplate", () => {
	test("removes workspace deps, rewrites name, strips vendored eslint config", () => {
		const dir = makeTmp();
		writeFileSync(
			join(dir, "package.json"),
			JSON.stringify(
				{
					name: "pi-general-app",
					workspaces: ["packages/*"],
					dependencies: { "@dyyz1993/rpc-core": "^1.2.0" },
					devDependencies: { "@dyyz1993/eslint-plugin-rpc": "workspace:*" },
				},
				null,
				"\t"
			)
		);
		writeFileSync(
			join(dir, "eslint.config.mjs"),
			[
				"import rpcPlugin from './eslint-plugin-rpc/index.js';",
				"export default [",
				"  {",
				"    // RPC 规范规则",
				"    plugins: { rpc: rpcPlugin },",
				"    rules: {",
				"      'rpc/no-bare-method': 'error',",
				"    },",
				"  },",
				"];",
				"",
			].join("\n")
		);

		postProcessTemplate(dir, "my-app");

		const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf-8"));
		// workspace:* 必须被移除，且不允许写回（update --force 的回归测试）
		expect(pkg.devDependencies?.["@dyyz1993/eslint-plugin-rpc"]).toBeUndefined();
		expect(JSON.stringify(pkg)).not.toContain("workspace:");
		expect(pkg.workspaces).toBeUndefined();
		// rpc-core 版本必须仍然是一个合法 semver range（在线取最新，离线保留原值）
		expect(pkg.dependencies?.["@dyyz1993/rpc-core"]).toMatch(/^\^?\d+\.\d+\.\d+/);
		// 项目名写回（此前模板 name 永远不会被替换）
		expect(pkg.name).toBe("my-app");

		const eslint = readFileSync(join(dir, "eslint.config.mjs"), "utf-8");
		expect(eslint).not.toContain("rpcPlugin");
		expect(eslint).not.toContain("rpc/");
		expect(eslint).toContain("export default");

		// 规则剥离后 vendored 插件目录不应再进入用户项目
		expect(existsSync(join(dir, "eslint-plugin-rpc"))).toBe(false);
	});

	test("copies shared/ into the project", () => {
		const dir = makeTmp();
		postProcessTemplate(dir, "my-app");
		expect(existsSync(join(dir, "shared", "vite-base.config.ts"))).toBe(true);
		// 开发期专用文件不应进入用户项目
		expect(existsSync(join(dir, "shared", "http-routes.ts"))).toBe(false);
		expect(existsSync(join(dir, "shared", "logger.ts"))).toBe(false);
	});
});
