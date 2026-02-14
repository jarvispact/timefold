import js from '@eslint/js'
import globals from 'globals'
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default [
  { ignores: ['node_modules', '**/dist', '**/*.d.ts', 'eslint.config.js'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    name: 'typescript-base',
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2024,
      globals: globals.browser,
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      ...prettierConfig.rules,
    },
  },
  {
    name: 'typescript-source',
    files: ['packages/**/src/**/*.ts'],
    ignores: ['**/*.test.ts'],
    languageOptions: {
      parserOptions: {
        project: [
          './packages/ecs/tsconfig.json',
          './packages/math/tsconfig.json',
          './packages/webgpu/tsconfig.json',
          './packages/obj/tsconfig.json',
          './packages/gltf2/tsconfig.json',
          './packages/engine/tsconfig.json',
          './packages/examples/tsconfig.json',
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/restrict-template-expressions": 'off',
    },
  },
  {
    name: 'typescript-test',
    files: ['**/*.test.ts'],
    languageOptions: {
      parserOptions: {
        project: ['./packages/obj/tsconfig.test.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    name: 'typescript-node',
    files: ['**/vite.config.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.node.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
