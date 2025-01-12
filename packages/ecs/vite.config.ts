import path from 'path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/ecs.ts'),
            name: 'timefold-ecs',
            formats: ['umd'],
            fileName: (format) => `ecs.${format}.js`,
        },
    },
});
