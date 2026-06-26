import { resolve } from "path";
import { existsSync, readFileSync } from "fs";
import { getRootDir, resolveTemplateDir } from "../lib/templates.js";
import { copyAndReplace } from "../lib/copy.js";
import { execSync } from "child_process";

interface TemplateMeta {
	templateType: string;
	projectName: string;
}

function detectTemplateMeta(targetDir: string): TemplateMeta | null {
	const pkgPath = resolve(targetDir, "package.json");
	if (!existsSync(pkgPath)) return null;

	try {
		const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
		const projectName = pkg.name || null;
		if (!projectName) return null;

		const sharedDir = resolve(targetDir, "src", "shared");
		const modulesDir = existsSync(sharedDir) ? resolve(sharedDir, "modules") : null;
		if (!modulesDir || !existsSync(modulesDir)) return null;

		const modules = new Set(
			execSync(`ls ${modulesDir}`, { encoding: "utf-8" }).trim().split("\n").filter(Boolean)
		);

		if (modules.has("bash") && modules.has("todo") && modules.has("rules")) {
			return { templateType: "agent", projectName };
		}
		if (modules.has("browser")) {
			return { templateType: "browser-agent", projectName };
		}
		if (modules.has("task") && modules.has("context") && modules.has("output")) {
			return { templateType: "cowork", projectName };
		}
		if (modules.has("chat") && !modules.has("file") && !modules.has("git")) {
			return { templateType: "chat", projectName };
		}
		return { templateType: "general", projectName };
	} catch {
		return null;
	}
}

export async function runUpdate(args: string[]): Promise<void> {
	let targetDir = process.cwd();
	let force = false;
	let dryRun = false;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--dir" && args[i + 1]) {
			targetDir = resolve(args[++i]!);
		} else if (arg === "--force") {
			force = true;
		} else if (arg === "--dry-run") {
			dryRun = true;
		} else if (arg === "--help" || arg === "-h") {
			console.log(`
Usage: create-agent update [options]

Update project to latest template version.

Options:
  --dir <path>    Target project directory (default: current directory)
  --force         Overwrite all template files without confirmation
  --dry-run       Show what would change without modifying files
  -h, --help      Show this help message

Examples:
  create-agent update
  create-agent update --dir ~/projects/my-app
  create-agent update --dry-run
  create-agent update --force
`);
			process.exit(0);
		}
	}

	if (!existsSync(targetDir)) {
		console.error(`Directory does not exist: ${targetDir}`);
		process.exit(1);
	}

	const meta = detectTemplateMeta(targetDir);
	if (!meta) {
		console.error(
			"Cannot detect template type. Make sure you're in a pi-agent-template project directory."
		);
		process.exit(1);
	}

	const { templateType, projectName } = meta;
	console.log(`Detected template: ${templateType}`);
	console.log(`Project name: ${projectName}`);
	console.log("");

	const rootDir = getRootDir();
	const templateDir = resolveTemplateDir(rootDir, templateType);

	if (dryRun) {
		console.log("Dry run - showing changes:");
		console.log("");
		const diffResult = execSync(
			`diff -rq --exclude='node_modules' --exclude='dist' --exclude='build' --exclude='.git' --exclude='.husky' --exclude='.server-port' --exclude='logs' --exclude='bun.lock' --exclude='pnpm-lock.yaml' "${templateDir}/" "${targetDir}/" 2>&1 || true`,
			{
				encoding: "utf-8",
				maxBuffer: 10 * 1024 * 1024,
			}
		);
		if (!diffResult.trim()) {
			console.log("No changes detected. Project is up to date!");
		} else {
			console.log(diffResult);
		}
		return;
	}

	if (!force) {
		console.log("This will update your project template files.");
		console.log(
			"Files in src/shared/handlers/, src/shared/modules/, and src/shared/lib/ will be preserved."
		);
		console.log("");
		console.log("Run with --force to overwrite all files, or --dry-run to preview changes.");
		return;
	}

	copyAndReplace(templateDir, targetDir, projectName);

	console.log("");
	console.log("Template files updated successfully!");
	console.log("");
	console.log("Next steps:");
	console.log("  1. Review the changes with: git diff");
	console.log("  2. Run: bun install");
	console.log("  3. Test: bun run dev:web");
}
