import path from 'path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/math.ts'),
            name: 'timefold-math',
            formats: ['umd'],
            fileName: (format) => `math.${format}.js`,
        },
    },
});
