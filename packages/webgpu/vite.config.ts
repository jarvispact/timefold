import path from 'path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/webgpu.ts'),
            name: 'timefold-webgpu',
            formats: ['umd'],
            fileName: (format) => `webgpu.${format}.js`,
        },
    },
});
