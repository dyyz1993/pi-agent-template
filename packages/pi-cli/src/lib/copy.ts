import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "fs";
import { join, resolve } from "path";
import { execSync } from "child_process";

const SKIP_DIRS = new Set(["node_modules", "build", "dist", ".git", ".husky", ".trae"]);
const SKIP_FILES = new Set(["bun.lock", "rpc-browser.js"]);

export interface CopyOptions {
	projectName: string;
	templateDir: string;
	targetDir: string;
}

export function deriveNames(projectName: string) {
	const pascalName = projectName.replace(/(^|-)([a-z])/g, (_, _sep, c) => c.toUpperCase());
	const identifier = `com.${projectName.replace(/-/g, "")}.app`;
	const shortId = `com.${projectName.replace(/-/g, "")}`;
	return { pascalName, identifier, shortId };
}

export function copyAndReplace(srcDir: string, destDir: string, projectName: string): void {
	const { pascalName, identifier, shortId } = deriveNames(projectName);

	mkdirSync(destDir, { recursive: true });

	const entries = readdirSync(srcDir, { withFileTypes: true });

	for (const entry of entries) {
		const srcPath = join(srcDir, entry.name);
		const destPath = join(destDir, entry.name);

		if (entry.isDirectory()) {
			if (SKIP_DIRS.has(entry.name)) continue;
			copyAndReplace(srcPath, destPath, projectName);
		} else {
			if (SKIP_FILES.has(entry.name)) continue;

			let content = readFileSync(srcPath, "utf-8");

			content = content.replace(/pi-agent-template/g, projectName);
			content = content.replace(/Pi Agent Template/g, pascalName);
			content = content.replace(/Pi Agent/g, pascalName);
			content = content.replace(/com\.piagent\.template/g, identifier);
			content = content.replace(/com\.piagent/g, shortId);
			content = content.replace(/@pi-agent\//g, `@${projectName}/`);

			writeFileSync(destPath, content);
		}
	}
}

function copyTraeRules(monorepoRoot: string, targetDir: string, projectName: string): void {
	const traeRulesDir = resolve(monorepoRoot, ".trae", "rules");
	if (!existsSync(traeRulesDir)) return;

	const destRulesDir = join(targetDir, ".trae", "rules");
	mkdirSync(destRulesDir, { recursive: true });

	const files = readdirSync(traeRulesDir).filter((f) => f !== "memory.md");
	for (const file of files) {
		const src = join(traeRulesDir, file);
		const dest = join(destRulesDir, file);
		let content = readFileSync(src, "utf-8");
		content = content.replace(/pi-agent-template/g, projectName);
		writeFileSync(dest, content);
	}
}

function copySharedModules(monorepoRoot: string, targetDir: string, projectName: string): void {
	const sharedDir = resolve(monorepoRoot, "templates", "shared");
	if (!existsSync(sharedDir)) return;

	const destSharedDir = join(targetDir, "shared");
	copyAndReplace(sharedDir, destSharedDir, projectName);

	const tsconfigPath = join(targetDir, "tsconfig.json");
	if (existsSync(tsconfigPath)) {
		let tsconfig = readFileSync(tsconfigPath, "utf-8");
		tsconfig = tsconfig.replace(/"\.\.\/shared\/\*"/g, '"./shared/*"');
		tsconfig = tsconfig.replace(/"\.\.\/shared"/g, '"./shared"');
		writeFileSync(tsconfigPath, tsconfig);
	}

	cleanSharedViteConfig(destSharedDir);
}

function cleanViteConfig(targetDir: string): void {
	const viteConfigPath = join(targetDir, "vite.config.ts");
	const vitestConfigPath = join(targetDir, "vitest.config.ts");

	for (const configPath of [viteConfigPath, vitestConfigPath]) {
		if (!existsSync(configPath)) continue;

		let config = readFileSync(configPath, "utf-8");

		config = config.replace(/,\n\s+resolve:\s*\{\n\s+alias:\s*\{[^}]*\}[,\s]*\}[,;]?\n/g, "");

		if (!config.includes('from "path"') && config.includes("resolve(")) {
			config = 'import { resolve } from "path";\n' + config;
		}

		config = config.replace(
			/from ["']\.\.\/shared\/vite-base\.config["']/g,
			'from "./shared/vite-base.config"'
		);
		config = config.replace(
			/from ["']\.\.\/shared\/vitest-base\.config["']/g,
			'from "./shared/vitest-base.config"'
		);

		writeFileSync(configPath, config);
	}
}

function cleanSharedViteConfig(sharedDir: string): void {
	const viteBaseConfigPath = join(sharedDir, "vite-base.config.ts");
	const vitestBaseConfigPath = join(sharedDir, "vitest-base.config.ts");

	for (const configPath of [viteBaseConfigPath, vitestBaseConfigPath]) {
		if (!existsSync(configPath)) continue;

		let config = readFileSync(configPath, "utf-8");
		config = config.replace(
			/,?\s*\n?\s*"@dyyz1993\/rpc-core":\s*resolve\(\s*\n?\s*dirname,\s*\n?\s*"\.\.",\s*\n?\s*"\.\.",\s*\n?\s*"packages",\s*\n?\s*"rpc-core",\s*\n?\s*"src",\s*\n?\s*"index\.ts"\s*\n?\s*\),?\s*\n?/g,
			""
		);
		config = config.replace(
			/resolve\(\s*\n?\s*dirname,\s*\n?\s*"\.\.",\s*\n?\s*"shared"\s*\n?\s*\)/g,
			'resolve(dirname, "shared")'
		);
		writeFileSync(configPath, config);
	}
}

function resolvePackageVersion(packageName: string): string {
	try {
		return execSync(`npm view ${packageName} version`, { encoding: "utf-8" }).trim();
	} catch {
		return "1.0.0";
	}
}

const WORKSPACE_PACKAGES = ["@dyyz1993/rpc-core", "@dyyz1993/eslint-plugin-rpc"];

function updatePackageJson(targetDir: string, _projectName: string): void {
	const rootPkgPath = join(targetDir, "package.json");
	if (!existsSync(rootPkgPath)) return;

	const rootPkg = JSON.parse(readFileSync(rootPkgPath, "utf-8"));

	delete rootPkg.workspaces;

	for (const depKey of ["dependencies", "devDependencies"] as const) {
		if (!rootPkg[depKey]) continue;
		for (const pkgName of WORKSPACE_PACKAGES) {
			if (!rootPkg[depKey][pkgName]) continue;
			if (pkgName === "@dyyz1993/rpc-core") {
				const version = resolvePackageVersion(pkgName);
				rootPkg[depKey][pkgName] = `^${version}`;
			} else {
				delete rootPkg[depKey][pkgName];
			}
		}
	}

	writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, "\t") + "\n");

	const eslintConfigPath = join(targetDir, "eslint.config.mjs");
	if (existsSync(eslintConfigPath)) {
		const lines = readFileSync(eslintConfigPath, "utf-8").split("\n");
		const filteredLines: string[] = [];

		let inRpcSection = false;
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			if (line.includes("import rpcPlugin") && line.includes("@dyyz1993/eslint-plugin-rpc")) {
				continue;
			}

			if (line.includes("RPC") && line.includes("规范规则")) {
				inRpcSection = true;
				continue;
			}

			if (inRpcSection) {
				if (line.trim().startsWith("'rpc/") || line.trim().startsWith('"rpc/')) {
					continue;
				}
				inRpcSection = false;
			}

			if (line.includes("rpc: rpcPlugin")) {
				continue;
			}

			filteredLines.push(line);
		}

		let content = filteredLines.join("\n");
		content = content.replace(/\n\s+plugins:\s*\{\s*\},?\s*\n/g, "\n");

		writeFileSync(eslintConfigPath, content);
	}
}

export async function copyTemplate(options: CopyOptions): Promise<void> {
	const { projectName, templateDir, targetDir } = options;
	const localRoot = resolve(import.meta.dir, "..", "..", "..", "..");
	const isMonorepo = existsSync(resolve(localRoot, "templates", "general"));

	if (existsSync(targetDir)) {
		throw new Error(`Directory "${targetDir}" already exists.`);
	}

	const { identifier } = deriveNames(projectName);

	console.log(`Creating project: ${projectName}`);
	console.log(`Target directory: ${targetDir}`);
	console.log(`App identifier:   ${identifier}`);
	console.log("");

	copyAndReplace(templateDir, targetDir, projectName);
	if (isMonorepo) {
		copyTraeRules(localRoot, targetDir, projectName);
		copySharedModules(localRoot, targetDir, projectName);
	}
	cleanViteConfig(targetDir);
	updatePackageJson(targetDir, projectName);

	console.log("Initializing git...");
	execSync("git init", { cwd: targetDir, stdio: "pipe" });

	console.log("Installing dependencies...");
	execSync("bun install", { cwd: targetDir, stdio: "inherit" });

	console.log("Building browser bundle...");
	try {
		execSync("bun run build:browser", { cwd: targetDir, stdio: "pipe" });
	} catch {
		console.log("(build:browser skipped - script not found)");
	}

	const huskyDir = join(targetDir, ".husky");
	mkdirSync(huskyDir, { recursive: true });
	writeFileSync(
		join(huskyDir, "pre-commit"),
		[
			"#!/bin/sh",
			"bun run lint",
			'ERRORS=$(bunx tsc --noEmit 2>&1 | grep "error TS" | grep -v "node_modules" || true)',
			'if [ -n "$ERRORS" ]; then',
			'  echo "$ERRORS"',
			"  exit 1",
			"fi",
		].join("\n") + "\n"
	);

	execSync("git add -A", { cwd: targetDir, stdio: "pipe" });

	try {
		execSync(`git commit --no-verify -m "feat: init ${projectName} from pi-agent-template"`, {
			cwd: targetDir,
			stdio: "pipe",
		});
	} catch {
		console.log("(git commit skipped - no files to commit)");
	}

	console.log("");
	console.log("Project created successfully!");
	console.log("");
	console.log("Next steps:");
	console.log(`  cd ${targetDir}`);
	console.log("  bun run dev          # Start desktop app (Electrobun)");
	console.log("  bun run dev:web      # Start web mode (Vite + Gateway)");
	console.log("");
}
