import { expect, it, describe } from 'vitest';
import * as Wgsl from './wgsl';
import * as Bgl from './bgl';

describe('Bgl.groups().getWgsl()', () => {
    it('should generate a single group with a single binding', () => {
        const Camera = Wgsl.struct('Camera', {
            view_proj: 'mat4x4<f32>',
        });

        const Layout = Bgl.groups([Bgl.group([Bgl.uniform(Camera, 'camera')])]);

        expect(Layout.getWgsl()).toEqual(
            `
struct Camera {
    view_proj: mat4x4<f32>
}

@group(0) @binding(0) var<uniform> camera: Camera;
`.trim(),
        );
    });

    it('should deduplicate structs when the same struct is used in multiple bindings', () => {
        const Transform = Wgsl.struct('Transform', {
            model_matrix: 'mat4x4<f32>',
        });

        const Layout = Bgl.groups([
            Bgl.group([Bgl.uniform(Transform, 'transform_a'), Bgl.uniform(Transform, 'transform_b')]),
        ]);

        expect(Layout.getWgsl()).toEqual(
            `
struct Transform {
    model_matrix: mat4x4<f32>
}

@group(0) @binding(0) var<uniform> transform_a: Transform;
@group(0) @binding(1) var<uniform> transform_b: Transform;
`.trim(),
        );
    });

    it('should deduplicate structs used across different groups', () => {
        const Transform = Wgsl.struct('Transform', {
            model_matrix: 'mat4x4<f32>',
        });

        const Layout = Bgl.groups([
            Bgl.group([Bgl.uniform(Transform, 'transform_a')]),
            Bgl.group([Bgl.uniform(Transform, 'transform_b')]),
        ]);

        expect(Layout.getWgsl()).toEqual(
            `
struct Transform {
    model_matrix: mat4x4<f32>
}

@group(0) @binding(0) var<uniform> transform_a: Transform;
@group(1) @binding(0) var<uniform> transform_b: Transform;
`.trim(),
        );
    });

    it('should emit nested struct dependencies before the parent struct', () => {
        const Material = Wgsl.struct('Material', {
            color: 'vec4<f32>',
            roughness: 'f32',
        });

        const Mesh = Wgsl.struct('Mesh', {
            model_matrix: 'mat4x4<f32>',
            material: Material,
        });

        const Layout = Bgl.groups([Bgl.group([Bgl.uniform(Mesh, 'mesh')])]);

        expect(Layout.getWgsl()).toEqual(
            `
struct Material {
    color: vec4<f32>,
    roughness: f32
}

struct Mesh {
    model_matrix: mat4x4<f32>,
    material: Material
}

@group(0) @binding(0) var<uniform> mesh: Mesh;
`.trim(),
        );
    });

    it('should emit deeply nested struct dependencies in correct order', () => {
        const Inner = Wgsl.struct('Inner', {
            value: 'vec4<f32>',
        });

        const Middle = Wgsl.struct('Middle', {
            inner: Inner,
            scale: 'f32',
        });

        const Outer = Wgsl.struct('Outer', {
            middle: Middle,
            position: 'vec3<f32>',
        });

        const Layout = Bgl.groups([Bgl.group([Bgl.uniform(Outer, 'data')])]);

        expect(Layout.getWgsl()).toEqual(
            `
struct Inner {
    value: vec4<f32>
}

struct Middle {
    inner: Inner,
    scale: f32
}

struct Outer {
    middle: Middle,
    position: vec3<f32>
}

@group(0) @binding(0) var<uniform> data: Outer;
`.trim(),
        );
    });

    it('should deduplicate shared nested struct dependencies across bindings', () => {
        const Material = Wgsl.struct('Material', {
            color: 'vec4<f32>',
        });

        const MeshA = Wgsl.struct('MeshA', {
            material: Material,
            position: 'vec3<f32>',
        });

        const MeshB = Wgsl.struct('MeshB', {
            material: Material,
            scale: 'f32',
        });

        const Layout = Bgl.groups([Bgl.group([Bgl.uniform(MeshA, 'mesh_a'), Bgl.uniform(MeshB, 'mesh_b')])]);

        expect(Layout.getWgsl()).toEqual(
            `
struct Material {
    color: vec4<f32>
}

struct MeshA {
    material: Material,
    position: vec3<f32>
}

struct MeshB {
    material: Material,
    scale: f32
}

@group(0) @binding(0) var<uniform> mesh_a: MeshA;
@group(0) @binding(1) var<uniform> mesh_b: MeshB;
`.trim(),
        );
    });

    it('should generate storage binding declarations', () => {
        const Particle = Wgsl.struct('Particle', {
            position: 'vec3<f32>',
            velocity: 'vec3<f32>',
        });

        const Layout = Bgl.groups([
            Bgl.group([Bgl.storage(Particle, 'particles'), Bgl.readOnlyStorage(Particle, 'prev_particles')]),
        ]);

        expect(Layout.getWgsl()).toEqual(
            `
struct Particle {
    position: vec3<f32>,
    velocity: vec3<f32>
}

@group(0) @binding(0) var<storage, read_write> particles: Particle;
@group(0) @binding(1) var<storage, read> prev_particles: Particle;
`.trim(),
        );
    });

    it('should generate sampler and texture binding declarations', () => {
        const Layout = Bgl.groups([Bgl.group([Bgl.texture('diffuse_tex'), Bgl.sampler('diffuse_sampler')])]);

        expect(Layout.getWgsl()).toEqual(
            `
@group(0) @binding(0) var diffuse_tex: texture_2d<f32>;
@group(0) @binding(1) var diffuse_sampler: sampler;
`.trim(),
        );
    });

    it('should generate mixed binding types across groups', () => {
        const Camera = Wgsl.struct('Camera', {
            view_proj: 'mat4x4<f32>',
        });

        const Layout = Bgl.groups([
            Bgl.group([Bgl.uniform(Camera, 'camera')]),
            Bgl.group([Bgl.texture('albedo'), Bgl.sampler('tex_sampler')]),
        ]);

        expect(Layout.getWgsl()).toEqual(
            `
struct Camera {
    view_proj: mat4x4<f32>
}

@group(0) @binding(0) var<uniform> camera: Camera;
@group(1) @binding(0) var albedo: texture_2d<f32>;
@group(1) @binding(1) var tex_sampler: sampler;
`.trim(),
        );
    });

    it('should handle uniform with a primitive type (no struct declaration)', () => {
        const Layout = Bgl.groups([Bgl.group([Bgl.uniform('f32', 'time')])]);
        expect(Layout.getWgsl()).toEqual(`@group(0) @binding(0) var<uniform> time: f32;`);
    });

    it('should handle uniform with a sized array type', () => {
        const Layout = Bgl.groups([Bgl.group([Bgl.uniform(Wgsl.sizedArray('vec4<f32>', 64), 'palette')])]);
        expect(Layout.getWgsl()).toEqual(`@group(0) @binding(0) var<uniform> palette: array<vec4<f32>, 64>;`);
    });

    it('should handle storage with a runtime array type', () => {
        const Particle = Wgsl.struct('Particle', {
            position: 'vec3<f32>',
            velocity: 'vec3<f32>',
        });

        const Layout = Bgl.groups([Bgl.group([Bgl.storage(Wgsl.runtimeArray(Particle, 1024), 'particles')])]);

        expect(Layout.getWgsl()).toEqual(
            `
struct Particle {
    position: vec3<f32>,
    velocity: vec3<f32>
}

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
`.trim(),
        );
    });
});
