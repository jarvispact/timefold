import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
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
                                args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan,WebGPUDeveloperFeatures'],
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
