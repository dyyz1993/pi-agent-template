import { getAllTemplates } from '../lib/templates.js';

export async function runList(): Promise<void> {
  const templates = getAllTemplates();

  console.log('Available templates:\n');
  for (const t of templates) {
    const suffix = t.available ? '' : ' (coming soon)';
    console.log(`  ${t.type.padEnd(10)} ${t.description}${suffix}`);
  }
  console.log('');
}
