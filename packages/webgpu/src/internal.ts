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

export type InvalidArrayType =
    | 'i32'
    | 'u32'
    | 'f32'
    | 'vec2i'
    | 'vec2u'
    | 'vec2f'
    | 'vec2<i32>'
    | 'vec2<u32>'
    | 'vec2<f32>';

export const roundUp = (alignment: number, value: number): number => {
    const mask = alignment - 1;
    return (value + mask) & ~mask;
};
