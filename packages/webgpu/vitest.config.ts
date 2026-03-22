import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { PreviewServer, ViteDevServer, Plugin } from 'vite';

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

export default defineConfig({
    plugins: [sharedArrayBufferHeaderPlugin()],
    test: {
        projects: [
            {
                test: {
                    include: ['./src/**/*.test.ts'],
                    name: 'unit',
                    environment: 'node',
                    setupFiles: ['./test-setup.ts'],
                },
            },
            {
                test: {
                    include: ['./src/**/*.browser-test.ts'],
                    name: 'browser',
                    browser: {
                        headless: true,
                        viewport: { width: 512, height: 512 },
                        enabled: true,
                        provider: playwright({
                            launchOptions: {
                                channel: 'chrome',
                                args: [
                                    '--enable-unsafe-webgpu',
                                    '--enable-features=Vulkan,WebGPUDeveloperFeatures,SharedArrayBuffer',
                                ],
                            },
                        }),
                        instances: [{ browser: 'chromium' }],
                        expect: {
                            toMatchScreenshot: {
                                comparatorOptions: {
                                    threshold: 0,
                                    allowedMismatchedPixelRatio: 0,
                                },
                            },
                        },
                    },
                },
            },
        ],
    },
});
