import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import rpcPlugin from './eslint-plugin-rpc/index.js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      'node_modules/**',
      'build/**',
      'dist/**',
      'eslint-plugin-rpc/**',
      'dist-electron/**',
      'electron/**',
      'postcss.config.js',
      'tailwind.config.js',
    ],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      rpc: rpcPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      ...jsxA11y.configs.recommended.rules,
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/no-autofocus': 'warn',
      // TS 严格规则
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-empty-object-type': ['error', { allowObjectTypes: 'always', allowInterfaces: 'with-single-extends' }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/ban-ts-comment': ['error', {
        'ts-expect-error': 'allow-with-description',
        'ts-ignore': true,
        'ts-nocheck': true,
        'ts-check': false,
        minimumDescriptionLength: 3,
      }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-console': ['error', { allow: ['warn', 'error'] }],

      // RPC 规范规则（严格模式，全部 error）
      'rpc/no-bare-method': 'error',
      'rpc/no-direct-register': 'error',
      'rpc/schema-merge-only': 'error',
      'rpc/module-file-naming': 'error',
      'rpc/require-typed-register': 'error',
      'rpc/require-api-client': 'error',
      'rpc/no-hardcoded-strings': 'warn',
    },
  },
  {
    files: ['src/shared/lib/logger.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['src/**/__tests__/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
    },
  },
);
