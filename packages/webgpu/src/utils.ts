// ===========================================================
// device and context

import {
    CreateContextOptions,
    CreateDeviceAndContextOptions,
    CreateDeviceAndContextResult,
    CreateDeviceOptions,
} from './util-types';

const defaultAdapterOptions: GPURequestAdapterOptions = {
    powerPreference: 'high-performance',
    forceFallbackAdapter: false,
};

export const createDevice = async (options: CreateDeviceOptions = {}): Promise<GPUDevice> => {
    const adapterOptions = { ...defaultAdapterOptions, ...options.adapter };
    const adapter = await navigator.gpu.requestAdapter(adapterOptions);
    if (!adapter) throw new Error('Webgpu not available');

    const device = await adapter.requestDevice(options.device);
    return device;
};

export const createContext = (options: CreateContextOptions): GPUCanvasContext => {
    const context = options.canvas.getContext('webgpu');
    if (!context) throw new Error('Webgpu not available');

    const format = navigator.gpu.getPreferredCanvasFormat();

    context.configure({
        device: options.device,
        ...options.contextConfig,
        format: options.contextConfig?.format ?? format,
    });

    return context;
};

export const createDeviceAndContext = async (
    options: CreateDeviceAndContextOptions,
): Promise<CreateDeviceAndContextResult> => {
    const device = await createDevice({ adapter: options.adapter, device: options.device });
    const context = createContext({ canvas: options.canvas, device, contextConfig: options.contextConfig });
    const format = navigator.gpu.getPreferredCanvasFormat();
    return { device, context, format };
};
