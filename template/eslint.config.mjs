import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'build/**',
      '**/dist/**',
      'src/rpc-browser.js',
      'src/mainview/public/**',
      '!eslint.config.mjs',
      '!**/.eslintrc*',
    ],
  },
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: './tsconfig.json',
      },
    },
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.type='MemberExpression'][callee.object.name='console'][callee.property.name='log']",
          message: '禁止使用 console.log，请使用 pino Logger。参见 .trae/rules/logging.md',
        },
        {
          selector: "CallExpression[callee.type='MemberExpression'][callee.object.name='console'][callee.property.name='info']",
          message: '禁止使用 console.info，请使用 pino Logger。参见 .trae/rules/logging.md',
        },
        {
          selector: "CallExpression[callee.type='MemberExpression'][callee.object.name='console'][callee.property.name='debug']",
          message: '禁止使用 console.debug，请使用 pino Logger。参见 .trae/rules/logging.md',
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/prefer-includes': 'error',
      '@typescript-eslint/prefer-string-starts-ends-with': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    files: ['src/mainview/**/*.ts', 'src/mainview/**/*.tsx'],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: './tsconfig.json',
      },
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
);
