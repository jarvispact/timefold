import path from 'path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
    resolve: {
        alias: {
            '@timefold/ecs': path.resolve(__dirname, '../ecs/src/ecs.ts'),
            '@timefold/math': path.resolve(__dirname, '../math/src/math.ts'),
            '@timefold/webgpu': path.resolve(__dirname, '../webgpu/src/webgpu.ts'),
        },
    },
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/engine.ts'),
            name: 'timefold-engine',
            formats: ['umd'],
            fileName: (format) => `engine.${format}.js`,
        },
    },
});
