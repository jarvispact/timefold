import path from 'path';
import { defineConfig, Plugin, PreviewServer, ViteDevServer } from 'vite';

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
            '@timefold/ecs': path.resolve(__dirname, '../ecs/src/ecs.ts'),
            '@timefold/math': path.resolve(__dirname, '../math/src/math.ts'),
            '@timefold/webgpu': path.resolve(__dirname, '../webgpu/src/webgpu.ts'),
            '@timefold/obj': path.resolve(__dirname, '../obj/src/obj.ts'),
            '@timefold/engine': path.resolve(__dirname, '../engine/src/engine.ts'),
        },
    },
    build: {
        target: 'esnext',
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules/')) {
                        return 'vendor';
                    }
                },
            },
        },
    },
});
