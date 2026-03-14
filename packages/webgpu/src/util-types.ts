// ===========================================================
// device and context

export type CreateContextOptions = {
    canvas: HTMLCanvasElement | OffscreenCanvas;
    device: GPUDevice;
    contextConfig?: Omit<GPUCanvasConfiguration, 'device'>;
};

export type CreateDeviceOptions = {
    adapter?: GPURequestAdapterOptions;
    device?: GPUDeviceDescriptor;
};

export type CreateDeviceAndContextOptions = {
    canvas: HTMLCanvasElement | OffscreenCanvas;
    adapter?: GPURequestAdapterOptions;
    device?: GPUDeviceDescriptor;
    contextConfig?: Omit<GPUCanvasConfiguration, 'device'>;
};

export type CreateDeviceAndContextResult = {
    device: GPUDevice;
    context: GPUCanvasContext;
    format: GPUTextureFormat;
};
