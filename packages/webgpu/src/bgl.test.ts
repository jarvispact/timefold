import { expect, it, describe } from 'vitest';
import * as Wgsl from './wgsl';
import * as Bgl from './bgl';

describe('struct.getWgsl()', () => {
    it('should generate', () => {
        const Camera = Wgsl.struct('Camera', {
            position: 'vec3<f32>',
            view: 'mat4x4<f32>',
            proj: 'mat4x4<f32>',
            view_proj: 'mat4x4<f32>',
        });

        const PointLight = Wgsl.struct('PointLight', {
            position: 'vec3<f32>',
            color: 'vec3<f32>',
            intensity: 'f32',
        });

        const Material = Wgsl.struct('Material', {
            color: 'vec4<f32>',
            roughness: 'f32',
        });

        const Transform = Wgsl.struct('Transform', {
            model_matrix: 'mat4x4<f32>',
            normal_matrix: 'mat4x4<f32>',
        });

        const FrameGroup = Bgl.group([Bgl.uniform(Camera, 'camera'), Bgl.uniform(PointLight, 'light')]);
        const EntityGroup = Bgl.group([Bgl.uniform(Material, 'material'), Bgl.uniform(Transform, 'transform')]);
        const Layout = Bgl.groups([FrameGroup, EntityGroup]);

        expect(Layout.getWgsl()).toEqual(
            `
struct Camera {
    position: vec3<f32>,
    view: mat4x4<f32>,
    proj: mat4x4<f32>,
    view_proj: mat4x4<f32>
}

struct PointLight {
    position: vec3<f32>,
    color: vec3<f32>,
    intensity: f32
}

struct Material {
    color: vec4<f32>,
    roughness: f32
}

struct Transform {
    model_matrix: mat4x4<f32>,
    normal_matrix: mat4x4<f32>
}

@group(0) @binding(0) var<uniform> camera: Camera;
@group(0) @binding(1) var<uniform> light: PointLight;
@group(1) @binding(0) var<uniform> material: Material;
@group(1) @binding(1) var<uniform> transform: Transform;
`.trim(),
        );
    });
});
