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
