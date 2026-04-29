import { resolve } from 'path';
import { resolveTemplateDir, getMonorepoRoot } from '../lib/templates.js';
import { copyTemplate } from '../lib/copy.js';

export async function runCreate(args: string[]): Promise<void> {
  let templateType = 'general';
  let customDir: string | undefined;

  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--type' && args[i + 1]) {
      templateType = args[++i];
    } else if (arg === '--dir' && args[i + 1]) {
      customDir = args[++i];
    } else if (!arg.startsWith('--')) {
      positional.push(arg);
    }
  }

  const projectName = positional[0];
  if (!projectName) {
    console.log(`
Usage: pi create <name> [--type <type>] [--dir <path>]

Options:
  --type <type>   Template type (default: general)
  --dir <path>    Target directory (default: ./<name>)

Examples:
  pi create my-app
  pi create my-app --type chat
  pi create my-app --dir ~/projects/my-app
`);
    process.exit(1);
  }

  const sanitized = projectName.replace(/[^a-zA-Z0-9-_]/g, '-');
  const targetDir = customDir ? resolve(customDir) : resolve(process.cwd(), sanitized);
  const monorepoRoot = getMonorepoRoot();
  const templateDir = resolveTemplateDir(monorepoRoot, templateType);

  await copyTemplate({
    projectName: sanitized,
    templateDir,
    targetDir,
  });
}
