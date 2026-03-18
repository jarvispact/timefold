import { expect, it, describe } from 'vitest';
import { struct, sizedArray } from './wgsl';

describe('struct.getWgsl()', () => {
    it('should generate a struct declaration with primitive fields', () => {
        const S = struct('PointLight', {
            position: 'vec3<f32>',
            color: 'vec3<f32>',
            intensity: 'f32',
        });

        expect(S.getWgsl()).toEqual(
            `
struct PointLight {
    position: vec3<f32>,
    color: vec3<f32>,
    intensity: f32
}
`.trim(),
        );
    });

    it('should generate a struct declaration with a reference to a nested struct', () => {
        const Material = struct('Material', {
            color: 'vec4<f32>',
            roughness: 'f32',
        });

        const S = struct('Mesh', {
            modelMatrix: 'mat4x4<f32>',
            material: Material,
        });

        expect(S.getWgsl()).toEqual(
            `
struct Mesh {
    modelMatrix: mat4x4<f32>,
    material: Material
}
`.trim(),
        );
    });

    it('should generate a struct with a sized array referencing another struct', () => {
        const Joint = struct('Joint', {
            transform: 'mat4x4<f32>',
            parentIndex: 'i32',
        });

        const Skeleton = struct('Skeleton', {
            joints: sizedArray(Joint, 64),
            jointCount: 'u32',
        });

        expect(Skeleton.getWgsl()).toEqual(
            `
struct Skeleton {
    joints: array<Joint, 64>,
    jointCount: u32
}
`.trim(),
        );
    });

    it('should generate a struct with a sized array of primitives', () => {
        const S = struct('Weights', {
            values: sizedArray('vec4<f32>', 16),
            count: 'u32',
        });

        expect(S.getWgsl()).toEqual(
            `
struct Weights {
    values: array<vec4<f32>, 16>,
    count: u32
}
`.trim(),
        );
    });

    it('should generate a struct with a single field', () => {
        const S = struct('Index', {
            value: 'u32',
        });

        expect(S.getWgsl()).toEqual(
            `
struct Index {
    value: u32
}
`.trim(),
        );
    });

    it('should generate a struct with a nested sized array', () => {
        const S = struct('Grid', {
            cells: sizedArray(sizedArray('vec4<f32>', 4), 8),
            count: 'u32',
        });

        expect(S.getWgsl()).toEqual(
            `
struct Grid {
    cells: array<array<vec4<f32>, 4>, 8>,
    count: u32
}
`.trim(),
        );
    });

    it('should generate a struct with mixed field types', () => {
        const Material = struct('Material', {
            color: 'vec4<f32>',
            roughness: 'f32',
        });

        const S = struct('DrawCall', {
            modelMatrix: 'mat4x4<f32>',
            material: Material,
            boneWeights: sizedArray('vec4<f32>', 4),
            instanceCount: 'u32',
        });

        expect(S.getWgsl()).toEqual(
            `
struct DrawCall {
    modelMatrix: mat4x4<f32>,
    material: Material,
    boneWeights: array<vec4<f32>, 4>,
    instanceCount: u32
}
`.trim(),
        );
    });
});
