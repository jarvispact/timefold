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

    it('should generate a struct declaration without expanding nested structs', () => {
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

    it('should deduplicate nested structs referenced multiple times', () => {
        const RigidBody = struct('RigidBody', {
            position: 'vec3<f32>',
            velocity: 'vec3<f32>',
            mass: 'f32',
        });

        const CollisionPair = struct('CollisionPair', {
            bodyA: RigidBody,
            bodyB: RigidBody,
            contactNormal: 'vec3<f32>',
            penetrationDepth: 'f32',
        });

        expect(CollisionPair.getWgsl({ expandNested: true })).toEqual(
            `
struct RigidBody {
    position: vec3<f32>,
    velocity: vec3<f32>,
    mass: f32
}

struct CollisionPair {
    bodyA: RigidBody,
    bodyB: RigidBody,
    contactNormal: vec3<f32>,
    penetrationDepth: f32
}
`.trim(),
        );
    });

    it('should generate a struct with a sized array field', () => {
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

    it('should expand nested structs inside sized arrays', () => {
        const Joint = struct('Joint', {
            transform: 'mat4x4<f32>',
            parentIndex: 'i32',
        });

        const Skeleton = struct('Skeleton', {
            joints: sizedArray(Joint, 64),
            jointCount: 'u32',
        });

        expect(Skeleton.getWgsl({ expandNested: true })).toEqual(
            `
struct Joint {
    transform: mat4x4<f32>,
    parentIndex: i32
}

struct Skeleton {
    joints: array<Joint, 64>,
    jointCount: u32
}
`.trim(),
        );
    });

    it('should expand deeply nested structs in dependency order', () => {
        const TextureInfo = struct('TextureInfo', {
            uvOffset: 'vec2<f32>',
            uvScale: 'vec2<f32>',
        });

        const Material = struct('Material', {
            albedo: TextureInfo,
            roughness: 'f32',
        });

        const Mesh = struct('Mesh', {
            modelMatrix: 'mat4x4<f32>',
            material: Material,
        });

        expect(Mesh.getWgsl({ expandNested: true })).toEqual(
            `
struct TextureInfo {
    uvOffset: vec2<f32>,
    uvScale: vec2<f32>
}

struct Material {
    albedo: TextureInfo,
    roughness: f32
}

struct Mesh {
    modelMatrix: mat4x4<f32>,
    material: Material
}
`.trim(),
        );
    });
});
