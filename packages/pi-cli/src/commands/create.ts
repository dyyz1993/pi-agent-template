import { resolve } from "path";
import { resolveTemplateDir, getRootDir } from "../lib/templates.js";
import { copyTemplate, expandTilde } from "../lib/copy.js";

const HELP = `
Usage: create-agent create <name> [--type <type>] [--dir <path>]

Options:
  --type <type>   Template type (default: general)
  --dir <path>    Target directory (default: ./<name>)

Examples:
  create-agent create my-app
  create-agent create my-app --type chat
  create-agent create my-app --dir ~/projects/my-app
`;

function fail(message: string): never {
	console.error(message);
	process.exit(1);
}

interface ParsedArgs {
	positional: string[];
	options: { type?: string; dir?: string };
	error?: string;
}

/** Pure arg parser (no process.exit) so it can be unit tested. */
export function parseArgs(args: string[]): ParsedArgs {
	const positional: string[] = [];
	const options: { type?: string; dir?: string } = {};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i]!;
		if (arg === "--") {
			positional.push(...args.slice(i + 1));
			break;
		}
		if (arg === "-h" || arg === "--help") continue;
		if (arg.startsWith("--")) {
			const eq = arg.indexOf("=");
			const key = eq === -1 ? arg.slice(2) : arg.slice(2, eq);
			let value = eq === -1 ? undefined : arg.slice(eq + 1);

			if (key !== "type" && key !== "dir") {
				return { positional, options, error: `Unknown option: ${arg}\n${HELP}` };
			}
			if (value === undefined) {
				const next = args[i + 1];
				if (!next || next.startsWith("--")) {
					return {
						positional,
						options,
						error: `Option --${key} requires a value.\n${HELP}`,
					};
				}
				value = next;
				i++;
			}
			if (key === "type") options.type = value;
			else options.dir = value;
		} else {
			positional.push(arg);
		}
	}

	return { positional, options };
}

export async function runCreate(args: string[]): Promise<void> {
	if (args.includes("-h") || args.includes("--help")) {
		console.log(HELP);
		process.exit(0);
	}

	const { positional, options, error } = parseArgs(args);
	if (error) fail(error);
	const templateType = options.type ?? "general";
	const customDir = options.dir;

	const projectNameArg = positional[0];
	const targetArg = customDir || positional[1];
	if (!projectNameArg) {
		console.log(HELP);
		process.exit(1);
	}

	const sanitized = projectNameArg.replace(/[^a-zA-Z0-9-_]/g, "-");
	// Reject names that sanitize into garbage (e.g. Chinese input -> "----")
	// instead of silently creating unusable package names / bundle ids.
	if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(sanitized)) {
		fail(
			`Invalid project name: "${projectNameArg}"\n` +
				"Use a name starting with a letter or digit, containing only letters, digits, '-', '_' (e.g. my-app)."
		);
	}

	const targetDir = targetArg ? resolve(expandTilde(targetArg)) : resolve(process.cwd(), sanitized);
	const rootDir = getRootDir();
	const templateDir = resolveTemplateDir(rootDir, templateType);

	await copyTemplate({
		projectName: sanitized,
		templateDir,
		targetDir,
	});
}
