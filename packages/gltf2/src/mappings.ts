export const accessorTypeMapping = {
    SCALAR: 1,
    VEC2: 2,
    VEC3: 3,
    VEC4: 4,
    MAT2: 4,
    MAT3: 9,
    MAT4: 16,
};

type AccessorTypeMapping = typeof accessorTypeMapping;
export type UnparsedAccessorType = keyof AccessorTypeMapping;

export const componentTypeMapping = {
    5120: {
        type: 'BYTE',
        indexFormat: 'uint16',
        byteSize: 1,
        createView: (buffer: ArrayBufferLike, byteOffset: number, size: number) =>
            new Int8Array(buffer, byteOffset, size),
    },
    5121: {
        type: 'UNSIGNED_BYTE',
        indexFormat: 'uint16',
        byteSize: 1,
        createView: (buffer: ArrayBufferLike, byteOffset: number, size: number) =>
            new Uint8Array(buffer, byteOffset, size),
    },
    5122: {
        type: 'SHORT',
        indexFormat: 'uint16',
        byteSize: 2,
        createView: (buffer: ArrayBufferLike, byteOffset: number, size: number) =>
            new Int16Array(buffer, byteOffset, size),
    },
    5123: {
        type: 'UNSIGNED_SHORT',
        indexFormat: 'uint16',
        byteSize: 2,
        createView: (buffer: ArrayBufferLike, byteOffset: number, size: number) =>
            new Uint16Array(buffer, byteOffset, size),
    },
    5125: {
        type: 'UNSIGNED_INT',
        indexFormat: 'uint32',
        byteSize: 4,
        createView: (buffer: ArrayBufferLike, byteOffset: number, size: number) =>
            new Uint32Array(buffer, byteOffset, size),
    },
    5126: {
        type: 'FLOAT',
        indexFormat: 'uint32', // invalid - but we expect gltf exporters to do the correct thing
        byteSize: 4,
        createView: (buffer: ArrayBufferLike, byteOffset: number, size: number) =>
            new Float32Array(buffer, byteOffset, size),
    },
} as const;

type ComponentTypeMapping = typeof componentTypeMapping;
export type UnparsedComponentType = keyof ComponentTypeMapping;
export type ParsedComponentTypeType = ComponentTypeMapping[UnparsedComponentType]['type'];
export type ParsedComponentTypeIndexFormat = ComponentTypeMapping[UnparsedComponentType]['indexFormat'];
export type ParsedComponentTypeView = ReturnType<ComponentTypeMapping[UnparsedComponentType]['createView']>;

// TODO: Support Webgl and offer mapping in userland?
export const primitiveModeMapping = {
    0: 'point-list',
    1: 'line-list',
    // 2: 'LINE_LOOP', webgl only
    3: 'line-strip',
    4: 'triangle-list',
    5: 'triangle-strip',
    // 6: 'TRIANGLE_FAN', webgl only
} as const;

type PrimitiveModeMapping = typeof primitiveModeMapping;
export type UnparsedGltf2PrimitiveMode = keyof PrimitiveModeMapping;
export type ParsedGltf2PrimitiveMode = PrimitiveModeMapping[UnparsedGltf2PrimitiveMode];

export const bufferViewTargetMapping = {
    34962: 'ARRAY_BUFFER',
    34963: 'ELEMENT_ARRAY_BUFFER',
} as const;

type BufferViewTargetMapping = typeof bufferViewTargetMapping;
export type UnparsedBufferViewTarget = keyof BufferViewTargetMapping;

export const samplerMagFilterMapping = {
    9728: 'NEAREST',
    9729: 'LINEAR',
} as const;

type SamplerMagFilterMapping = typeof samplerMagFilterMapping;
export type UnparsedSamplerMagFilter = keyof SamplerMagFilterMapping;
export type ParsedSamplerMagFilter = SamplerMagFilterMapping[UnparsedSamplerMagFilter];

export const samplerMinFilterMapping = {
    9728: 'NEAREST',
    9729: 'LINEAR',
    9984: 'NEAREST_MIPMAP_NEAREST',
    9985: 'LINEAR_MIPMAP_NEAREST',
    9986: 'NEAREST_MIPMAP_LINEAR',
    9987: 'LINEAR_MIPMAP_LINEAR',
} as const;

type SamplerMinFilterMapping = typeof samplerMinFilterMapping;
export type UnparsedSamplerMinFilter = keyof SamplerMinFilterMapping;
export type ParsedSamplerMinFilter = SamplerMinFilterMapping[UnparsedSamplerMinFilter];

export const samplerWrapMapping = {
    33071: 'CLAMP_TO_EDGE',
    33648: 'MIRRORED_REPEAT',
    10497: 'REPEAT',
} as const;

type SamplerWrapMapping = typeof samplerWrapMapping;
export type UnparsedSamplerWrap = keyof SamplerWrapMapping;
export type ParsedSamplerWrap = SamplerWrapMapping[UnparsedSamplerWrap];

export const animationChannelMapping = {
    translation: { type: 'VEC3' },
    rotation: { type: 'VEC4' },
    scale: { type: 'VEC3' },
    weights: { type: 'SCALAR' },
} as const;

type AnimationChannelMapping = typeof animationChannelMapping;
export type UnparsedAnimationChannelPath = keyof AnimationChannelMapping;
