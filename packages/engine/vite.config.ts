import path from 'path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/engine.ts'),
            name: 'timefold-engine',
            formats: ['umd'],
            fileName: (format) => `engine.${format}.js`,
        },
    },
});
