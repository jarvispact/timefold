export type Entity = {
    data: ArrayBuffer;
    modelMatrix: Float32Array;
    color: Float32Array;
    buffer: GPUBuffer;
    bindgroup: GPUBindGroup;
};
