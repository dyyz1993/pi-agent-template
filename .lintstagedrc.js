const CLI_TEMPLATES_PREFIX = 'packages/pi-cli/templates/';

function isCliTemplate(f) {
  return f.startsWith(CLI_TEMPLATES_PREFIX);
}

module.exports = {
  'packages/rpc-core/src/**/*.ts': ['eslint --fix'],
  'packages/pi-cli/src/**/*.ts': [
    'eslint --fix',
    "echo 'Note: package is published as @dyyz1993/create-agent'",
  ],
  'scripts/**/*.ts': ['eslint --fix'],
  '*.{ts,tsx}': (files) => {
    const filtered = files.filter((f) => !isCliTemplate(f));
    if (filtered.length === 0) return 'echo "no files to lint"';
    return [
      `eslint --fix ${filtered.map((f) => `"${f}"`).join(' ')}`,
      `prettier --write ${filtered.map((f) => `"${f}"`).join(' ')}`,
    ];
  },
  '*.{json,md,css,html}': (files) => {
    const filtered = files.filter((f) => !isCliTemplate(f));
    if (filtered.length === 0) return 'echo "no files to format"';
    return `prettier --write ${filtered.map((f) => `"${f}"`).join(' ')}`;
  },
};
