import path from 'path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/gltf2.ts'),
            name: 'timefold-gltf2',
            formats: ['umd'],
            fileName: (format) => `gltf2.${format}.js`,
        },
    },
});
