import js from '@eslint/js'
import globals from 'globals'
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['node_modules', 'packages/**/dist'] },
  {
    name: 'typescript',
    extends: [js.configs.recommended, ...tseslint.configs.strictTypeChecked],
    files: ['packages/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {},
    plugins: {},
    rules: {
      "@typescript-eslint/restrict-template-expressions": 'off',
    },
  },
  {
    name: 'prettier',
    files: ['packages/**/*.ts'],
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      ...prettierConfig.rules,
    },
  },
)
