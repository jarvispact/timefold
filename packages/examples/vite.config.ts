import { defineConfig, Plugin, PreviewServer, ViteDevServer } from 'vite';
import path from 'node:path';

const setSharedArrayBufferHeaders = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use((_req, res, next) => {
        res.setHeader('cross-origin-embedder-policy', 'require-corp');
        res.setHeader('cross-origin-opener-policy', 'same-origin');
        next();
    });
};

const sharedArrayBufferHeaderPlugin = (): Plugin => ({
    name: 'configure-response-headers',
    configureServer: setSharedArrayBufferHeaders,
    configurePreviewServer: setSharedArrayBufferHeaders,
});

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [sharedArrayBufferHeaderPlugin()],
    resolve: {
        alias: {
            '@timefold/ecs': path.resolve(__dirname, '../ecs/src'),
            '@timefold/math': path.resolve(__dirname, '../math/src'),
            '@timefold/webgpu': path.resolve(__dirname, '../webgpu/src'),
            '@timefold/obj': path.resolve(__dirname, '../obj/src'),
            '@timefold/gltf2': path.resolve(__dirname, '../gltf2/src'),
            '@timefold/engine': path.resolve(__dirname, '../engine/src'),
        },
    },
    optimizeDeps: {
        exclude: [
            '@timefold/ecs',
            '@timefold/math',
            '@timefold/webgpu',
            '@timefold/obj',
            '@timefold/gltf2',
            '@timefold/engine',
        ],
    },
    server: {
        watch: {
            ignored: ['!**/node_modules/@timefold/**'],
        },
    },
    build: {
        target: 'esnext',
    },
});
