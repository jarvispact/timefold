import { expect, it, describe } from 'vitest';
import * as Wgsl from './wgsl';
import * as Bgl from './bgl';

describe('Bgl.layout().wgsl', () => {
    it('should generate a single group with a single binding', () => {
        const Camera = Wgsl.struct('Camera', {
            view_proj: 'mat4x4<f32>',
        });

        const Layout = Bgl.layout({
            scene: {
                camera: Bgl.uniform(Camera),
            },
        });

        expect(Layout.wgsl).toEqual(
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

        const Layout = Bgl.layout({
            transforms: {
                transform_a: Bgl.uniform(Transform),
                transform_b: Bgl.uniform(Transform),
            },
        });

        expect(Layout.wgsl).toEqual(
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

        const Layout = Bgl.layout({
            group_a: {
                transform_a: Bgl.uniform(Transform),
            },
            group_b: {
                transform_b: Bgl.uniform(Transform),
            },
        });

        expect(Layout.wgsl).toEqual(
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

        const Layout = Bgl.layout({
            object: {
                mesh: Bgl.uniform(Mesh),
            },
        });

        expect(Layout.wgsl).toEqual(
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

        const Layout = Bgl.layout({
            data: {
                data: Bgl.uniform(Outer),
            },
        });

        expect(Layout.wgsl).toEqual(
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

        const Layout = Bgl.layout({
            meshes: {
                mesh_a: Bgl.uniform(MeshA),
                mesh_b: Bgl.uniform(MeshB),
            },
        });

        expect(Layout.wgsl).toEqual(
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

        const Layout = Bgl.layout({
            simulation: {
                particles: Bgl.storage(Particle),
                prev_particles: Bgl.readOnlyStorage(Particle),
            },
        });

        expect(Layout.wgsl).toEqual(
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
        const Layout = Bgl.layout({
            material: {
                diffuse_tex: Bgl.texture(),
                diffuse_sampler: Bgl.sampler(),
            },
        });

        expect(Layout.wgsl).toEqual(
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

        const Layout = Bgl.layout({
            per_frame: {
                camera: Bgl.uniform(Camera),
            },
            material: {
                albedo: Bgl.texture(),
                tex_sampler: Bgl.sampler(),
            },
        });

        expect(Layout.wgsl).toEqual(
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
        const Layout = Bgl.layout({
            per_frame: {
                time: Bgl.uniform('f32'),
            },
        });
        expect(Layout.wgsl).toEqual(`@group(0) @binding(0) var<uniform> time: f32;`);
    });

    it('should handle uniform with a sized array type', () => {
        const Layout = Bgl.layout({
            per_frame: {
                palette: Bgl.uniform(Wgsl.sizedArray('vec4<f32>', 64)),
            },
        });
        expect(Layout.wgsl).toEqual(`@group(0) @binding(0) var<uniform> palette: array<vec4<f32>, 64>;`);
    });

    it('should handle storage with a runtime array type', () => {
        const Particle = Wgsl.struct('Particle', {
            position: 'vec3<f32>',
            velocity: 'vec3<f32>',
        });

        const Layout = Bgl.layout({
            simulation: {
                particles: Bgl.storage(Wgsl.runtimeArray(Particle, 1024)),
            },
        });

        expect(Layout.wgsl).toEqual(
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

        const Layout = Bgl.layout({
            uniforms: {
                camera: Bgl.uniform(Camera),
                time: Bgl.uniform('f32'),
                palette: Bgl.uniform(Wgsl.sizedArray('vec4<f32>', 16)),
            },
            storage: {
                output_data: Bgl.storage(Camera),
                input_data: Bgl.readOnlyStorage(Camera),
                counter: Bgl.storage('f32'),
                instances: Bgl.readOnlyStorage(Wgsl.runtimeArray(Camera, 1024)),
            },
            samplers: {
                filtering_sampler: Bgl.sampler(),
                comparison_sampler: Bgl.sampler({ type: 'comparison' }),
            },
            textures_float: {
                tex_2d: Bgl.texture(),
                tex_2d_array: Bgl.texture({ viewDimension: '2d-array' }),
                tex_3d: Bgl.texture({ viewDimension: '3d' }),
                tex_cube: Bgl.texture({ viewDimension: 'cube' }),
                tex_cube_array: Bgl.texture({ viewDimension: 'cube-array' }),
                tex_multisampled: Bgl.texture({ multisampled: true }),
            },
            textures_int: {
                tex_sint: Bgl.texture({ sampleType: 'sint' }),
                tex_uint: Bgl.texture({ sampleType: 'uint' }),
            },
            textures_depth: {
                tex_depth_2d: Bgl.texture({ sampleType: 'depth' }),
                tex_depth_2d_array: Bgl.texture({ sampleType: 'depth', viewDimension: '2d-array' }),
                tex_depth_cube: Bgl.texture({ sampleType: 'depth', viewDimension: 'cube' }),
                tex_depth_cube_array: Bgl.texture({ sampleType: 'depth', viewDimension: 'cube-array' }),
                tex_depth_multisampled: Bgl.texture({ sampleType: 'depth', multisampled: true }),
            },
            storage_textures: {
                st_write: Bgl.storageTexture({ format: 'rgba8unorm', access: 'write-only' }),
                st_read: Bgl.storageTexture({ format: 'r32float', access: 'read-only' }),
                st_readwrite: Bgl.storageTexture({ format: 'rgba16float', access: 'read-write' }),
                st_2d_array: Bgl.storageTexture({
                    format: 'rgba32float',
                    access: 'write-only',
                    viewDimension: '2d-array',
                }),
                st_3d: Bgl.storageTexture({
                    format: 'rgba8unorm',
                    access: 'write-only',
                    viewDimension: '3d',
                }),
            },
            external: {
                video_frame: Bgl.externalTexture(),
            },
        });

        expect(Layout.wgsl).toEqual(
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
