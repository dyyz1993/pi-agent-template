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
      'src/rpc-browser.js',
      'src/mainview/public/**',
      '!eslint.config.mjs',
      '!**/.eslintrc*',
    ],
  },
  {
    files: ['packages/rpc-core/src/**/*.ts'],
    rules: {
      'no-console': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-console': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='console']",
          message: '服务端代码禁止使用 console，请使用 Pino Logger。参见 .trae/rules/logging.md',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/packages/rpc-core/src/core/*'],
              message: '业务代码禁止直接导入 rpc-core/core，请使用 rpc-core 导出的 TypedRPCServer/TypedRPCClient',
            },
            {
              group: ['**/packages/rpc-core/src/transports/*'],
              message: '业务代码禁止直接导入 Transport 实现，Transport 由入口文件配置，业务代码通过 RPCClient/RPCServer 间接使用',
            },
          ],
          paths: [
            {
              name: '../packages/rpc-core/src/server',
              message: '请使用 TypedRPCServer 替代 RPCServer，以获得类型推导。import { TypedRPCServer } from "../packages/rpc-core/src/index"',
            },
            {
              name: '../packages/rpc-core/src/client',
              message: '请使用 TypedRPCClient 替代 RPCClient，以获得类型推导。import { TypedRPCClient } from "../packages/rpc-core/src/index"',
            },
          ],
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    files: ['src/schema.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/packages/rpc-core/src/core/*', '**/packages/rpc-core/src/transports/*'],
              message: 'schema.ts 只能导入类型定义（RPCMethods, RPCEvents 等），不能导入运行时代码',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/mainview/**/*.ts', 'src/mainview/**/*.tsx'],
    rules: {
      'no-console': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
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
