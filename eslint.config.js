import baseConfig from './eslint.config.base.js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...baseConfig,
  {
    name: 'typescript-root',
    files: ['packages/**/*.ts'],
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
);
