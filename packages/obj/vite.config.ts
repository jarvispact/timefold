import path from 'path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/obj.ts'),
            name: 'timefold-obj',
            formats: ['umd'],
            fileName: (format) => `obj.${format}.js`,
        },
    },
});
