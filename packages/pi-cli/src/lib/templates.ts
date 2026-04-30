import { resolve } from 'path';

interface TemplateInfo {
  type: string;
  description: string;
  available: boolean;
  dir: string;
}

const TEMPLATES: TemplateInfo[] = [
  {
    type: 'general',
    description: 'Full-featured template (File explorer, Git, Search, Chat, Timer, Feed)',
    available: true,
    dir: 'templates/general',
  },
  {
    type: 'chat',
    description: 'Chat-focused template (Enhanced ChatPanel, Markdown, Session management)',
    available: true,
    dir: 'templates/chat',
  },
  {
    type: 'agent',
    description: 'Coding agent template (Bash, Rules engine, Todo management)',
    available: true,
    dir: 'templates/agent',
  },
];

export function getTemplateInfo(type: string): TemplateInfo | undefined {
  return TEMPLATES.find((t) => t.type === type);
}

export function getAllTemplates(): TemplateInfo[] {
  return TEMPLATES;
}

export function resolveTemplateDir(monorepoRoot: string, type: string): string {
  const info = getTemplateInfo(type);
  if (!info) {
    throw new Error(`Unknown template type: "${type}". Run "pi list" to see available types.`);
  }
  if (!info.available) {
    throw new Error(`Template "${type}" is not available yet (coming soon).`);
  }
  return resolve(monorepoRoot, info.dir);
}

export function getMonorepoRoot(): string {
  return resolve(import.meta.dir, '..', '..', '..', '..');
}
