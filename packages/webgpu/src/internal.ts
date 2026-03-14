// uniforms

import {
    WgslArrayElementGeneric,
    WgslRuntimeArray,
    WgslScalar,
    WgslSizedArray,
    WgslStruct,
    WgslStructDefinitionGeneric,
} from './wgsl-types';

export const WGSL_LOOKUP_TABLE = {
    f32: { align: 4, size: 4, components: 1 },
    i32: { align: 4, size: 4, components: 1 },
    u32: { align: 4, size: 4, components: 1 },

    'vec2<f32>': { align: 8, size: 8, components: 2 },
    'vec2<i32>': { align: 8, size: 8, components: 2 },
    'vec2<u32>': { align: 8, size: 8, components: 2 },

    'vec3<f32>': { align: 16, size: 12, components: 3 },
    'vec3<i32>': { align: 16, size: 12, components: 3 },
    'vec3<u32>': { align: 16, size: 12, components: 3 },

    'vec4<f32>': { align: 16, size: 16, components: 4 },
    'vec4<i32>': { align: 16, size: 16, components: 4 },
    'vec4<u32>': { align: 16, size: 16, components: 4 },

    // matCxR<f32>: C columns of vecR, each at stride = roundUp(align(vecR), size(vecR))
    'mat2x2<f32>': { align: 8, size: 16, components: 4 }, // 2 × stride(vec2) = 2×8
    'mat2x3<f32>': { align: 16, size: 32, components: 6 }, // 2 × stride(vec3) = 2×16
    'mat2x4<f32>': { align: 16, size: 32, components: 8 }, // 2 × stride(vec4) = 2×16
    'mat3x2<f32>': { align: 8, size: 24, components: 6 }, // 3 × stride(vec2) = 3×8
    'mat3x3<f32>': { align: 16, size: 48, components: 9 }, // 3 × stride(vec3) = 3×16
    'mat3x4<f32>': { align: 16, size: 48, components: 12 }, // 3 × stride(vec4) = 3×16
    'mat4x2<f32>': { align: 8, size: 32, components: 8 }, // 4 × stride(vec2) = 4×8
    'mat4x3<f32>': { align: 16, size: 64, components: 12 }, // 4 × stride(vec3) = 4×16
    'mat4x4<f32>': { align: 16, size: 64, components: 16 }, // 4 × stride(vec4) = 4×16
} as const;

export type InvalidArrayType = 'f32' | 'i32' | 'u32' | 'vec2<f32>' | 'vec2<i32>' | 'vec2<u32>';

export const roundUp = (alignment: number, value: number): number => {
    const mask = alignment - 1;
    return (value + mask) & ~mask;
};

type ViewConfigEntry<Scalar extends WgslScalar> = {
    scalar: Scalar;
    byteOffset: number;
    componentCount: number;
};

type _TupleOf<T, N extends number, R extends unknown[]> = R['length'] extends N ? R : _TupleOf<T, N, [T, ...R]>;
export type Tuple<T, N extends number> = N extends N ? (number extends N ? T[] : _TupleOf<T, N, []>) : never;

export type ViewConfig<Type> = Type extends WgslScalar
    ? ViewConfigEntry<Type>
    : Type extends `${string}<${infer Scalar extends WgslScalar}>`
      ? ViewConfigEntry<Scalar>
      : Type extends WgslStruct<string, infer Definition>
        ? { [K in keyof Definition]: ViewConfig<Definition[K]> }
        : Type extends WgslSizedArray<infer Element, infer Size>
          ? Tuple<ViewConfig<Element>, Size>
          : Type extends WgslRuntimeArray<infer Element>
            ? ViewConfig<Element>[]
            : never;

export const getBufferSizeAndViewConfigForStruct = <Definition extends WgslStructDefinitionGeneric>(
    structDefinition: Definition,
    viewConfig: Record<string, unknown> = {},
) => {
    console.log({ structDefinition });
    // TODO: compute final buffer size in bytes and recursively build the view config
    return { bufferSize: 0, viewConfig: viewConfig as unknown as ViewConfig<WgslStruct<string, Definition>> };
};

export const getBufferSizeAndViewConfigForSizedArray = <Element extends WgslArrayElementGeneric, Size extends number>(
    element: Element,
    size: Size,
    viewConfig: unknown[] = [],
) => {
    console.log({ element, size });
    // TODO: compute final buffer size in bytes and recursively build the view config
    return { bufferSize: 0, viewConfig: viewConfig as unknown as ViewConfig<WgslSizedArray<Element, Size>> };
};

export const getBufferSizeAndViewConfigForRuntimeArray = <Element extends WgslArrayElementGeneric>(
    element: Element,
    maxSize: number,
    viewConfig: unknown[] = [],
) => {
    console.log({ element, maxSize });
    // TODO: compute final buffer size in bytes and recursively build the view config
    return { bufferSize: 0, viewConfig: viewConfig as unknown as ViewConfig<WgslRuntimeArray<Element>> };
};

// vertex

export const VERTEX_LOOKUP_TABLE = {
    sint8x2: { View: Int8Array, stride: 2, wgsl: 'vec2<i32>' },
    sint8x4: { View: Int8Array, stride: 4, wgsl: 'vec4<i32>' },

    uint8x2: { View: Uint8Array, stride: 2, wgsl: 'vec2<u32>' },
    uint8x4: { View: Uint8Array, stride: 4, wgsl: 'vec4<u32>' },

    sint16x2: { View: Int16Array, stride: 2, wgsl: 'vec2<i32>' },
    sint16x4: { View: Int16Array, stride: 4, wgsl: 'vec4<i32>' },

    uint16x2: { View: Uint16Array, stride: 2, wgsl: 'vec2<u32>' },
    uint16x4: { View: Uint16Array, stride: 4, wgsl: 'vec4<u32>' },

    sint32: { View: Int32Array, stride: 1, wgsl: 'i32' },
    sint32x2: { View: Int32Array, stride: 2, wgsl: 'vec2<i32>' },
    sint32x3: { View: Int32Array, stride: 3, wgsl: 'vec3<i32>' },
    sint32x4: { View: Int32Array, stride: 4, wgsl: 'vec4<i32>' },

    uint32: { View: Uint32Array, stride: 1, wgsl: 'u32' },
    uint32x2: { View: Uint32Array, stride: 2, wgsl: 'vec2<u32>' },
    uint32x3: { View: Uint32Array, stride: 3, wgsl: 'vec3<u32>' },
    uint32x4: { View: Uint32Array, stride: 4, wgsl: 'vec4<u32>' },

    float32: { View: Float32Array, stride: 1, wgsl: 'f32' },
    float32x2: { View: Float32Array, stride: 2, wgsl: 'vec2<f32>' },
    float32x3: { View: Float32Array, stride: 3, wgsl: 'vec3<f32>' },
    float32x4: { View: Float32Array, stride: 4, wgsl: 'vec4<f32>' },

    snorm8x2: { View: Int8Array, stride: 2, wgsl: 'vec2<f32>' },
    snorm8x4: { View: Int8Array, stride: 4, wgsl: 'vec4<f32>' },

    snorm16x2: { View: Int16Array, stride: 2, wgsl: 'vec2<f32>' },
    snorm16x4: { View: Int16Array, stride: 4, wgsl: 'vec4<f32>' },

    unorm8x2: { View: Uint8Array, stride: 2, wgsl: 'vec2<f32>' },
    unorm8x4: { View: Uint8Array, stride: 4, wgsl: 'vec4<f32>' },

    unorm16x2: { View: Uint16Array, stride: 2, wgsl: 'vec2<f32>' },
    unorm16x4: { View: Uint16Array, stride: 4, wgsl: 'vec4<f32>' },

    'unorm10-10-10-2': { View: Uint32Array, stride: 4, wgsl: 'vec4<f32>' },
} as const;
