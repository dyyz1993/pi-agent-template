import { resolve } from "path";
import { existsSync, readFileSync, readdirSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { spawnSync } from "child_process";
import { getRootDir, resolveTemplateDir } from "../lib/templates.js";
import { copyAndReplace, postProcessTemplate, expandTilde } from "../lib/copy.js";

interface TemplateMeta {
	templateType: string;
	projectName: string;
}

/** Detect which template a project was created from (exported for tests). */
export function detectTemplateMeta(targetDir: string): TemplateMeta | null {
	const pkgPath = resolve(targetDir, "package.json");
	if (!existsSync(pkgPath)) return null;

	try {
		const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
		const projectName = pkg.name || null;
		if (!projectName) return null;

		const sharedDir = resolve(targetDir, "src", "shared");
		const modulesDir = existsSync(sharedDir) ? resolve(sharedDir, "modules") : null;
		if (!modulesDir || !existsSync(modulesDir)) return null;

		const modules = new Set(readdirSync(modulesDir).filter((f) => !f.startsWith(".")));

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

const DIFF_EXCLUDES = [
	"node_modules",
	"dist",
	"build",
	".git",
	".husky",
	".server-port",
	"logs",
	"bun.lock",
	"pnpm-lock.yaml",
].flatMap((e) => [`--exclude=${e}`]);

function diffTemplateAgainstProject(
	templateDir: string,
	targetDir: string,
	projectName: string
): string {
	// Render the template into a temp dir first so the diff compares what
	// update --force would actually write, not the raw placeholders.
	const tmpDir = mkdtempSync(resolve(tmpdir(), "create-agent-update-"));
	try {
		copyAndReplace(templateDir, tmpDir, projectName);
		const result = spawnSync("diff", ["-rq", ...DIFF_EXCLUDES, `${tmpDir}/`, `${targetDir}/`], {
			encoding: "utf-8",
			maxBuffer: 10 * 1024 * 1024,
		});
		if (result.error) {
			return `(diff unavailable: ${result.error.message})`;
		}
		if (result.status === 2) {
			return `(diff failed: ${result.stderr.trim()})`;
		}
		return result.stdout.replaceAll(`${tmpDir}/`, "<template>/");
	} finally {
		rmSync(tmpDir, { recursive: true, force: true });
	}
}

export async function runUpdate(args: string[]): Promise<void> {
	let targetDir = process.cwd();
	let force = false;
	let dryRun = false;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--dir" && args[i + 1]) {
			targetDir = resolve(expandTilde(args[++i]!));
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
  --force         Overwrite ALL template files (including src/shared/, modules/, lib/)
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
		const diffResult = diffTemplateAgainstProject(templateDir, targetDir, projectName);
		if (!diffResult.trim()) {
			console.log("No changes detected. Project is up to date!");
		} else {
			console.log(diffResult);
		}
		return;
	}

	if (!force) {
		console.log("This command requires --force to run.");
		console.log("");
		console.log("NOTE: --force overwrites ALL template files, including your edits in");
		console.log("src/shared/handlers/, src/shared/modules/, src/shared/lib/. Commit or");
		console.log("stash your work first, then review the result with: git diff");
		console.log("");
		console.log("Use --dry-run to preview changes before forcing.");
		return;
	}

	copyAndReplace(templateDir, targetDir, projectName);
	postProcessTemplate(targetDir, projectName);

	console.log("");
	console.log("Template files updated successfully!");
	console.log("");
	console.log("Next steps:");
	console.log("  1. Review the changes with: git diff");
	console.log("  2. Run: bun install");
	console.log("  3. Test: bun run dev:web");
}
