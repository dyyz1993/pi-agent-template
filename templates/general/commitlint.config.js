export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'revert', 'perf']],
    'subject-max-length': [2, 'always', 80],
    'subject-case': [0],
  },
};
