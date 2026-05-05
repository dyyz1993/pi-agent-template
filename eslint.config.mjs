import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'build/**',
      '**/dist/**',
      'templates/**',
      'packages/pi-cli/templates/**',
      'packages/eslint-plugin-rpc/**',
      '!eslint.config.mjs',
      '!**/.eslintrc*',
    ],
  },
  {
    files: ['commitlint.config.js'],
    languageOptions: {
      globals: {
        module: 'readonly',
      },
    },
  },
  {
    files: ['packages/eslint-plugin-rpc/**/*.js'],
    languageOptions: {
      globals: {
        module: 'readonly',
        require: 'readonly',
      },
    },
  },
  {
    files: ['packages/pi-cli/scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
      },
    },
  },
  {
    files: ['scripts/**/*.ts'],
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['packages/rpc-core/src/**/*.ts'],
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['e2e/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['packages/pi-cli/src/**/*.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
