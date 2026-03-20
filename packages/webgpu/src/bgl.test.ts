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

    it('should generate correct wgsl declarations for every binding type and subtype', () => {
        const Camera = Wgsl.struct('Camera', {
            view_proj: 'mat4x4<f32>',
        });

        const Layout = Bgl.groups([
            // Group 0: uniform with struct, primitive, and sized array
            Bgl.group([
                Bgl.uniform(Camera, 'camera'),
                Bgl.uniform('f32', 'time'),
                Bgl.uniform(Wgsl.sizedArray('vec4<f32>', 16), 'palette'),
            ]),
            // Group 1: storage and read-only-storage
            Bgl.group([
                Bgl.storage(Camera, 'output_data'),
                Bgl.readOnlyStorage(Camera, 'input_data'),
                Bgl.storage('f32', 'counter'),
                Bgl.readOnlyStorage(Wgsl.runtimeArray(Camera, 1024), 'instances'),
            ]),
            // Group 2: sampler types
            Bgl.group([Bgl.sampler('filtering_sampler'), Bgl.sampler('comparison_sampler', { type: 'comparison' })]),
            // Group 3: texture types (float sample type with each view dimension)
            Bgl.group([
                Bgl.texture('tex_2d'),
                Bgl.texture('tex_2d_array', { viewDimension: '2d-array' }),
                Bgl.texture('tex_3d', { viewDimension: '3d' }),
                Bgl.texture('tex_cube', { viewDimension: 'cube' }),
                Bgl.texture('tex_cube_array', { viewDimension: 'cube-array' }),
                Bgl.texture('tex_multisampled', { multisampled: true }),
            ]),
            // Group 4: texture types (sint, uint sample types)
            Bgl.group([
                Bgl.texture('tex_sint', { sampleType: 'sint' }),
                Bgl.texture('tex_uint', { sampleType: 'uint' }),
            ]),
            // Group 5: depth texture types
            Bgl.group([
                Bgl.texture('tex_depth_2d', { sampleType: 'depth' }),
                Bgl.texture('tex_depth_2d_array', { sampleType: 'depth', viewDimension: '2d-array' }),
                Bgl.texture('tex_depth_cube', { sampleType: 'depth', viewDimension: 'cube' }),
                Bgl.texture('tex_depth_cube_array', { sampleType: 'depth', viewDimension: 'cube-array' }),
                Bgl.texture('tex_depth_multisampled', { sampleType: 'depth', multisampled: true }),
            ]),
            // Group 6: storage textures
            Bgl.group([
                Bgl.storageTexture('st_write', { format: 'rgba8unorm', access: 'write-only' }),
                Bgl.storageTexture('st_read', { format: 'r32float', access: 'read-only' }),
                Bgl.storageTexture('st_readwrite', { format: 'rgba16float', access: 'read-write' }),
                Bgl.storageTexture('st_2d_array', {
                    format: 'rgba32float',
                    access: 'write-only',
                    viewDimension: '2d-array',
                }),
                Bgl.storageTexture('st_3d', {
                    format: 'rgba8unorm',
                    access: 'write-only',
                    viewDimension: '3d',
                }),
            ]),
            // Group 7: external texture
            Bgl.group([Bgl.externalTexture('video_frame')]),
        ]);

        expect(Layout.getWgsl()).toEqual(
            `
struct Camera {
    view_proj: mat4x4<f32>
}

@group(0) @binding(0) var<uniform> camera: Camera;
@group(0) @binding(1) var<uniform> time: f32;
@group(0) @binding(2) var<uniform> palette: array<vec4<f32>, 16>;
@group(1) @binding(0) var<storage, read_write> output_data: Camera;
@group(1) @binding(1) var<storage, read> input_data: Camera;
@group(1) @binding(2) var<storage, read_write> counter: f32;
@group(1) @binding(3) var<storage, read> instances: array<Camera>;
@group(2) @binding(0) var filtering_sampler: sampler;
@group(2) @binding(1) var comparison_sampler: sampler_comparison;
@group(3) @binding(0) var tex_2d: texture_2d<f32>;
@group(3) @binding(1) var tex_2d_array: texture_2d_array<f32>;
@group(3) @binding(2) var tex_3d: texture_3d<f32>;
@group(3) @binding(3) var tex_cube: texture_cube<f32>;
@group(3) @binding(4) var tex_cube_array: texture_cube_array<f32>;
@group(3) @binding(5) var tex_multisampled: texture_multisampled_2d<f32>;
@group(4) @binding(0) var tex_sint: texture_2d<i32>;
@group(4) @binding(1) var tex_uint: texture_2d<u32>;
@group(5) @binding(0) var tex_depth_2d: texture_depth_2d;
@group(5) @binding(1) var tex_depth_2d_array: texture_depth_2d_array;
@group(5) @binding(2) var tex_depth_cube: texture_depth_cube;
@group(5) @binding(3) var tex_depth_cube_array: texture_depth_cube_array;
@group(5) @binding(4) var tex_depth_multisampled: texture_depth_multisampled_2d;
@group(6) @binding(0) var st_write: texture_storage_2d<rgba8unorm, write>;
@group(6) @binding(1) var st_read: texture_storage_2d<r32float, read>;
@group(6) @binding(2) var st_readwrite: texture_storage_2d<rgba16float, read_write>;
@group(6) @binding(3) var st_2d_array: texture_storage_2d_array<rgba32float, write>;
@group(6) @binding(4) var st_3d: texture_storage_3d<rgba8unorm, write>;
@group(7) @binding(0) var video_frame: texture_external;
`.trim(),
        );
    });
});
