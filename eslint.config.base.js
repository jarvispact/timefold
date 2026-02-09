import js from '@eslint/js'
import globals from 'globals'
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['node_modules', '**/dist', '**/*.d.ts', '**/.tsbuildinfo'] },
  {
    name: 'typescript-base',
    extends: [js.configs.recommended, ...tseslint.configs.strictTypeChecked],
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      "@typescript-eslint/restrict-template-expressions": 'off',
    },
  },
  {
    name: 'prettier',
    files: ['**/*.ts'],
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      ...prettierConfig.rules,
    },
  },
)
