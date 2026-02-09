import baseConfig from './eslint.config.base.js';
import tseslint from 'typescript-eslint';

export default [
  ...baseConfig,
  {
    name: 'typescript-source',
    files: ['packages/**/src/**/*.ts'],
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
  },
  {
    name: 'typescript-node',
    files: ['**/*.config.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.node.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
