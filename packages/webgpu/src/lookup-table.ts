import { WgslScalar, Tuple } from './internal-utils';

const create = <Size extends number>(size: Size): Tuple<number, Size> => {
    if (size === 1) return 0 as never;
    return new Array(size).fill(0) as never;
};

type WithCreateFn<T extends Record<string, { elements: number }>> = {
    [K in keyof T]: T[K] & { create: () => Tuple<number, T[K]['elements']> };
};

const createLookupTable = <
    const Lut extends Record<
        string,
        {
            elements: number;
            align: number;
            size: number;
            type: WgslScalar;
        }
    >,
>(
    lut: Lut,
): WithCreateFn<Lut> => {
    for (const key of Object.keys(lut)) {
        (lut[key] as Lut[string] & { create: () => unknown }).create = () => create(lut[key].elements);
    }

    return lut as never;
};

const lut = createLookupTable({
    i32: { elements: 1, align: 4, size: 4, type: 'i32' },
    u32: { elements: 1, align: 4, size: 4, type: 'u32' },
    f32: { elements: 1, align: 4, size: 4, type: 'f32' },

    vec2i: { elements: 2, align: 8, size: 8, type: 'i32' },
    vec2u: { elements: 2, align: 8, size: 8, type: 'u32' },
    vec2f: { elements: 2, align: 8, size: 8, type: 'f32' },

    vec3i: { elements: 3, align: 16, size: 12, type: 'i32' },
    vec3u: { elements: 3, align: 16, size: 12, type: 'u32' },
    vec3f: { elements: 3, align: 16, size: 12, type: 'f32' },

    vec4i: { elements: 4, align: 16, size: 16, type: 'i32' },
    vec4u: { elements: 4, align: 16, size: 16, type: 'u32' },
    vec4f: { elements: 4, align: 16, size: 16, type: 'f32' },

    mat2x2f: { elements: 4, align: 8, size: 16, type: 'f32' },
    mat3x2f: { elements: 6, align: 8, size: 24, type: 'f32' },
    mat4x2f: { elements: 8, align: 8, size: 32, type: 'f32' },

    mat2x3f: { elements: 8, align: 16, size: 32, type: 'f32' },
    mat3x3f: { elements: 12, align: 16, size: 48, type: 'f32' },
    mat4x3f: { elements: 16, align: 16, size: 64, type: 'f32' },

    mat2x4f: { elements: 8, align: 16, size: 32, type: 'f32' },
    mat3x4f: { elements: 12, align: 16, size: 48, type: 'f32' },
    mat4x4f: { elements: 16, align: 16, size: 64, type: 'f32' },
});

export const lookupTable = {
    ...lut,
    'vec2<i32>': lut.vec2i,
    'vec2<u32>': lut.vec2u,
    'vec2<f32>': lut.vec2f,

    'vec3<i32>': lut.vec3i,
    'vec3<u32>': lut.vec3u,
    'vec3<f32>': lut.vec3f,

    'vec4<i32>': lut.vec4i,
    'vec4<u32>': lut.vec4u,
    'vec4<f32>': lut.vec4f,

    'mat2x2<f32>': lut.mat2x2f,
    'mat3x2<f32>': lut.mat3x2f,
    'mat4x2<f32>': lut.mat4x2f,

    'mat2x3<f32>': lut.mat2x3f,
    'mat3x3<f32>': lut.mat3x3f,
    'mat4x3<f32>': lut.mat4x3f,

    'mat2x4<f32>': lut.mat2x4f,
    'mat3x4<f32>': lut.mat3x4f,
    'mat4x4<f32>': lut.mat4x4f,
} as const;

type LookupTable = typeof lookupTable;
export type LookupTableEntry<T extends WgslType> = LookupTable[T];
export type WgslType = keyof LookupTable;
export const wgslTypes = Object.keys(lookupTable);

type InvalidArrayType = 'i32' | 'u32' | 'f32' | 'vec2i' | 'vec2u' | 'vec2f' | 'vec2<i32>' | 'vec2<u32>' | 'vec2<f32>';
export type WgslArrayType = Exclude<WgslType, InvalidArrayType>;
