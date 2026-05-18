import { resolve } from "path";
import { resolveTemplateDir, getRootDir } from "../lib/templates.js";
import { copyTemplate } from "../lib/copy.js";

export async function runCreate(args: string[]): Promise<void> {
	let templateType = "general";
	let customDir: string | undefined;

	const positional: string[] = [];
	for (let i = 0; i < args.length; i++) {
		const arg = args[i]!;
		if (arg === "--type" && args[i + 1]) {
			templateType = args[++i]!;
		} else if (arg === "--dir" && args[i + 1]) {
			customDir = args[++i]!;
		} else if (!arg.startsWith("--")) {
			positional.push(arg);
		}
	}

	const projectName = positional[0];
	const targetArg = customDir || positional[1];
	if (!projectName) {
		console.log(`
Usage: create-agent create <name> [--type <type>] [--dir <path>]

Options:
  --type <type>   Template type (default: general)
  --dir <path>    Target directory (default: ./<name>)

Examples:
  create-agent create my-app
  create-agent create my-app --type chat
  create-agent create my-app --dir ~/projects/my-app
`);
		process.exit(1);
	}

	const sanitized = projectName.replace(/[^a-zA-Z0-9-_]/g, "-");
	const targetDir = targetArg ? resolve(targetArg) : resolve(process.cwd(), sanitized);
	const rootDir = getRootDir();
	const templateDir = resolveTemplateDir(rootDir, templateType);

	await copyTemplate({
		projectName: sanitized,
		templateDir,
		targetDir,
	});
}
