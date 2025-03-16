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
        ctor: Int8Array,
        bpe: Int8Array['BYTES_PER_ELEMENT'],
    },
    5121: {
        type: 'UNSIGNED_BYTE',
        ctor: Uint8Array,
        bpe: Uint8Array['BYTES_PER_ELEMENT'],
    },
    5122: {
        type: 'SHORT',
        ctor: Int16Array,
        bpe: Int16Array['BYTES_PER_ELEMENT'],
    },
    5123: {
        type: 'UNSIGNED_SHORT',
        ctor: Uint16Array,
        bpe: Uint16Array['BYTES_PER_ELEMENT'],
    },
    5125: {
        type: 'UNSIGNED_INT',
        ctor: Uint32Array,
        bpe: Uint32Array['BYTES_PER_ELEMENT'],
    },
    5126: {
        type: 'FLOAT',
        ctor: Float32Array,
        bpe: Float32Array['BYTES_PER_ELEMENT'],
    },
} as const;

type ComponentTypeMapping = typeof componentTypeMapping;
export type UnparsedComponentType = keyof ComponentTypeMapping;
export type ParsedComponentTypeType = ComponentTypeMapping[UnparsedComponentType]['type'];

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
