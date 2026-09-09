const CLI_TEMPLATES_MARKER = 'packages/pi-cli/templates/';

// Bundled template copies are linted by their own template configs; the root
// config must not run on them. Match by path segment so this works whether
// lint-staged hands us repo-relative or absolute paths.
function isCliTemplate(f) {
  return f.replace(/\\/g, '/').includes(CLI_TEMPLATES_MARKER);
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
