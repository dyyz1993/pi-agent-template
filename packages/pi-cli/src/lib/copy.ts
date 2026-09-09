import {
	readFileSync,
	writeFileSync,
	mkdirSync,
	existsSync,
	readdirSync,
	unlinkSync,
	chmodSync,
} from "fs";
import { join, resolve, extname } from "path";
import { homedir } from "os";
import { execFileSync } from "child_process";
import { getRootDir } from "./templates.js";

const SKIP_DIRS = new Set(["node_modules", "build", "dist", ".git", ".husky", ".trae"]);
const SKIP_FILES = new Set(["bun.lock"]);

const BINARY_EXTENSIONS = new Set([
	".png",
	".jpg",
	".jpeg",
	".gif",
	".webp",
	".ico",
	".icns",
	".ttf",
	".otf",
	".woff",
	".woff2",
	".mp3",
	".mp4",
	".wav",
	".pdf",
	".zip",
	".gz",
]);

export function expandTilde(targetPath: string): string {
	if (targetPath === "~") return homedir();
	if (targetPath.startsWith("~/")) return join(homedir(), targetPath.slice(2));
	return targetPath;
}

function isBinaryFile(filePath: string, buffer: Buffer): boolean {
	if (BINARY_EXTENSIONS.has(extname(filePath).toLowerCase())) return true;
	// A NUL byte in the first 8KB almost certainly means binary content;
	// reading such a file as utf-8 would silently corrupt it.
	return buffer.subarray(0, 8192).includes(0);
}

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

			const raw = readFileSync(srcPath);

			if (isBinaryFile(entry.name, raw)) {
				writeFileSync(destPath, raw);
				continue;
			}

			let content = raw.toString("utf-8");

			content = content.replace(/pi-agent-template/g, projectName);
			content = content.replace(/Pi Agent Template/g, pascalName);
			content = content.replace(/Pi Agent/g, pascalName);
			content = content.replace(/com\.piagent\.template/g, identifier);
			content = content.replace(/com\.piagent/g, shortId);

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

function copySharedModules(sourceRoot: string, targetDir: string, projectName: string): void {
	const sharedDir = resolve(sourceRoot, "templates", "shared");
	if (!existsSync(sharedDir)) return;

	const destSharedDir = join(targetDir, "shared");
	copyAndReplace(sharedDir, destSharedDir, projectName);

	for (const f of ["http-routes.ts", "logger.ts"]) {
		const p = join(destSharedDir, f);
		if (existsSync(p)) unlinkSync(p);
	}

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

function resolvePackageVersion(packageName: string, fallbackRange?: string): string {
	try {
		const version = execFileSync("npm", ["view", packageName, "version"], {
			encoding: "utf-8",
		}).trim();
		return `^${version}`;
	} catch {
		// Offline / registry failure: keep a usable range instead of silently
		// downgrading the project to an ancient version.
		if (fallbackRange && fallbackRange !== "workspace:*") {
			console.warn(`(Could not look up latest ${packageName}; keeping ${fallbackRange})`);
			return fallbackRange;
		}
		const fallback = NPM_FALLBACK_VERSIONS[packageName];
		if (fallback) {
			console.warn(`(Could not look up latest ${packageName}; falling back to ${fallback})`);
			return fallback;
		}
		console.warn(`(Could not look up latest ${packageName}; keeping ${String(fallbackRange)})`);
		return fallbackRange ?? "*";
	}
}

// Only used when the registry is unreachable AND no usable range is present;
// bundled templates carry pinned versions via post-sync-templates.mjs.
const NPM_FALLBACK_VERSIONS: Record<string, string> = {
	"@dyyz1993/rpc-core": "^2.2.0",
	"@dyyz1993/eslint-plugin-rpc": "^1.1.0",
};

const WORKSPACE_PACKAGES = ["@dyyz1993/rpc-core", "@dyyz1993/eslint-plugin-rpc"];

function updatePackageJson(targetDir: string, projectName: string): void {
	const rootPkgPath = join(targetDir, "package.json");
	if (!existsSync(rootPkgPath)) return;

	const rootPkg = JSON.parse(readFileSync(rootPkgPath, "utf-8"));

	delete rootPkg.workspaces;
	rootPkg.name = projectName;

	for (const depKey of ["dependencies", "devDependencies"] as const) {
		if (!rootPkg[depKey]) continue;
		for (const pkgName of WORKSPACE_PACKAGES) {
			if (!rootPkg[depKey][pkgName]) continue;
			rootPkg[depKey][pkgName] = resolvePackageVersion(pkgName, rootPkg[depKey][pkgName]);
		}
	}

	writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, "\t") + "\n");
}

/**
 * Shared post-processing after raw template files land in the target project.
 * Used by both `create` and `update --force`; skipping it used to leave
 * `workspace:*` deps and `../shared` imports in user projects.
 */
export function postProcessTemplate(targetDir: string, projectName: string): void {
	copySharedModules(getRootDir(), targetDir, projectName);
	cleanViteConfig(targetDir);
	updatePackageJson(targetDir, projectName);
}

function precheckExternalTools(): void {
	const missing: string[] = [];
	for (const tool of ["git", "bun"]) {
		try {
			execFileSync(tool, ["--version"], { stdio: "pipe" });
		} catch {
			missing.push(tool);
		}
	}
	if (missing.length > 0) {
		throw new Error(
			`Required tools not found: ${missing.join(", ")}. ` +
				`Install them before creating a project (bun: https://bun.sh).`
		);
	}
}

export async function copyTemplate(options: CopyOptions): Promise<void> {
	const { projectName, templateDir, targetDir } = options;
	const localRoot = resolve(import.meta.dir, "..", "..", "..", "..");
	const isMonorepo = existsSync(resolve(localRoot, "templates", "general"));

	if (existsSync(targetDir)) {
		throw new Error(`Directory "${targetDir}" already exists.`);
	}

	precheckExternalTools();

	const { identifier } = deriveNames(projectName);

	console.log(`Creating project: ${projectName}`);
	console.log(`Target directory: ${targetDir}`);
	console.log(`App identifier:   ${identifier}`);
	console.log("");

	copyAndReplace(templateDir, targetDir, projectName);
	if (isMonorepo) {
		copyTraeRules(localRoot, targetDir, projectName);
	}
	postProcessTemplate(targetDir, projectName);

	console.log("Initializing git...");
	execFileSync("git", ["init"], { cwd: targetDir, stdio: "pipe" });

	console.log("Installing dependencies...");
	execFileSync("bun", ["install"], { cwd: targetDir, stdio: "inherit" });

	console.log("Building browser bundle...");
	try {
		execFileSync("bun", ["run", "build:browser"], { cwd: targetDir, stdio: "pipe" });
	} catch {
		console.log("(build:browser skipped - script not found)");
	}

	const huskyDir = join(targetDir, ".husky");
	mkdirSync(huskyDir, { recursive: true });

	const hook = (name: string, content: string) => {
		const p = join(huskyDir, name);
		writeFileSync(p, content);
		chmodSync(p, 0o755);
	};

	hook(
		"pre-commit",
		`#!/bin/sh
bunx lint-staged

STAGED_TS=$(git diff --cached --name-only --diff-filter=ACMR | grep -c '\\.tsx\\?$' || true)

if [ "$STAGED_TS" -gt 0 ]; then
  echo "⏳ Type checking..."
  bunx tsc --noEmit 2>&1 | grep "error TS" | grep -v "node_modules" && exit 1 || true
fi

echo "✅ Pre-commit checks passed"
`
	);

	hook(
		"commit-msg",
		`#!/bin/sh
bunx commitlint --edit "$1"
`
	);

	hook(
		"pre-push",
		`#!/bin/sh
echo "⏳ Linting..."
bun run lint || { echo "❌ Lint failed."; exit 1; }

echo "⏳ Checking lockfile sync..."
git diff --name-only HEAD -- bun.lock | grep -q . && { echo "⚠️  bun.lock has uncommitted changes."; exit 1; }

echo "✅ Pre-push checks passed (full tests run in CI). Pushing..."
`
	);

	hook(
		"prepare-commit-msg",
		`#!/bin/sh
COMMIT_MSG_FILE="$1"
COMMIT_SOURCE="$2"

if [ "$COMMIT_SOURCE" = "merge" ] || [ "$COMMIT_SOURCE" = "squash" ] || [ "$COMMIT_SOURCE" = "commit" ]; then
  exit 0
fi

FIRST_LINE=$(head -n1 "$COMMIT_MSG_FILE")

if echo "$FIRST_LINE" | grep -qE '^[a-z]+(\\([^)]+\\))?:'; then
  exit 0
fi

STAGED=$(git diff --cached --name-only)

if echo "$STAGED" | grep -q "^src/"; then
  SCOPE="app"
elif echo "$STAGED" | grep -q "^components/"; then
  SCOPE="ui"
elif echo "$STAGED" | grep -q "^server/"; then
  SCOPE="server"
fi

if [ -n "$SCOPE" ]; then
  sed -i.bak -E "s/^([a-z]+)(\\([^)]+\\))?:/\\1($SCOPE):/" "$COMMIT_MSG_FILE"
  rm -f "\${COMMIT_MSG_FILE}.bak"
fi
`
	);

	hook(
		"post-merge",
		`#!/bin/sh
echo "⏳ Checking for dependency changes..."
CHANGED=$(git diff HEAD@{1} --name-only HEAD)

if echo "$CHANGED" | grep -q "bun.lock\\|package.json"; then
  echo "📦 Dependencies changed, running bun install..."
  bun install
fi
`
	);

	hook(
		"post-checkout",
		`#!/bin/sh
PREV_HEAD="$1"
NEW_HEAD="$2"
IS_BRANCH="$3"

if [ "$IS_BRANCH" = "1" ]; then
  CHANGED=$(git diff --name-only "$PREV_HEAD" "$NEW_HEAD" 2>/dev/null)
  if echo "$CHANGED" | grep -q "bun.lock\\|package.json"; then
    echo "📦 Dependencies changed between branches, running bun install..."
    bun install
  fi
fi
`
	);

	console.log("Initializing husky...");
	try {
		execFileSync("bun", ["run", "prepare"], { cwd: targetDir, stdio: "pipe" });
	} catch {
		console.warn("(husky init skipped - prepare script failed; git hooks not installed)");
	}

	execFileSync("git", ["add", "-A"], { cwd: targetDir, stdio: "pipe" });

	try {
		execFileSync(
			"git",
			["commit", "--no-verify", "-m", `feat: init ${projectName} from pi-agent-template`],
			{ cwd: targetDir, stdio: "pipe" }
		);
	} catch {
		console.log("(git commit skipped - check git user.name / user.email config)");
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
