import { expect, it, describe } from 'vitest';
import { struct } from './wgsl';

describe('struct.getWgsl()', () => {
    it('should generate a struct declaration with primitive fields', () => {
        const s = struct('PointLight', {
            position: 'vec3<f32>',
            color: 'vec3<f32>',
            intensity: 'f32',
        });

        expect(s.getWgsl()).toEqual(
            `
struct PointLight {
    position: vec3<f32>,
    color: vec3<f32>,
    intensity: f32,
}
`.trim(),
        );
    });

    it('should generate a struct declaration without expanding nested structs by default', () => {
        const material = struct('Material', {
            color: 'vec4<f32>',
            roughness: 'f32',
        });

        const s = struct('Mesh', {
            modelMatrix: 'mat4x4<f32>',
            material,
        });

        expect(s.getWgsl()).toEqual(
            `
struct Mesh {
    modelMatrix: mat4x4<f32>,
    material: Material,
}
`.trim(),
        );
    });

    it('should recursively expand nested struct declarations when enabled', () => {
        const material = struct('Material', {
            color: 'vec4<f32>',
            roughness: 'f32',
        });

        const s = struct('Mesh', {
            modelMatrix: 'mat4x4<f32>',
            material,
        });

        expect(s.getWgsl({ expandNested: true })).toEqual(
            `
struct Material {
    color: vec4<f32>,
    roughness: f32,
}

struct Mesh {
    modelMatrix: mat4x4<f32>,
    material: Material,
}
`.trim(),
        );
    });
});
