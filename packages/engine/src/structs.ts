import { Wgsl } from '@timefold/webgpu';

// scene

export const CameraStruct = Wgsl.struct('Camera', {
    position: Wgsl.type('vec3<f32>'),
    view_matrix: Wgsl.type('mat4x4<f32>'),
    projection_matrix: Wgsl.type('mat4x4<f32>'),
    view_projection_matrix: Wgsl.type('mat4x4<f32>'),
});

export type CameraStruct = typeof CameraStruct;

export const DirLightStruct = Wgsl.struct('DirLight', {
    direction: Wgsl.type('vec3<f32>'),
    color: Wgsl.type('vec3<f32>'),
    intensity: Wgsl.type('f32'),
});

export type DirLightStruct = typeof DirLightStruct;

export const MAX_DIR_LIGHTS = 3;

export const SceneStruct = Wgsl.struct('Scene', {
    camera: CameraStruct,
    dirLights: Wgsl.array(DirLightStruct, MAX_DIR_LIGHTS),
});

export type SceneStruct = typeof SceneStruct;

// transform

export const TransformStruct = Wgsl.struct('Transform', {
    model_matrix: Wgsl.type('mat4x4<f32>'),
    normal_matrix: Wgsl.type('mat4x4<f32>'),
});

export type TransformStruct = typeof TransformStruct;

// unlit

export const UnlitMaterialStruct = Wgsl.struct('UnlitMaterial', {
    color: Wgsl.type('vec3<f32>'),
    opacity: Wgsl.type('f32'),
});

export type UnlitMaterialStruct = typeof UnlitMaterialStruct;

export const UnlitEntityStruct = Wgsl.struct('Entity', {
    transform: TransformStruct,
    material: UnlitMaterialStruct,
});

export type UnlitEntityStruct = typeof UnlitEntityStruct;

// phong

export const PhongMaterialStruct = Wgsl.struct('PhongMaterial', {
    diffuse_color: Wgsl.type('vec3<f32>'),
    specular_color: Wgsl.type('vec3<f32>'),
    opacity: Wgsl.type('f32'),
});

export type PhongMaterialStruct = typeof PhongMaterialStruct;

export const PhongEntityStruct = Wgsl.struct('Entity', {
    transform: TransformStruct,
    material: PhongMaterialStruct,
});

export type PhongEntityStruct = typeof PhongEntityStruct;
