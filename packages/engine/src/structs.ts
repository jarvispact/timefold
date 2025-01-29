import { Wgsl } from '@timefold/webgpu';
import {
    CameraStruct,
    DirLightStruct,
    MAX_DIR_LIGHTS_TYPE,
    PhongEntityStruct,
    PhongMaterialStruct,
    SceneStruct,
    TransformStruct,
} from './types';

export const Camera: CameraStruct = Wgsl.struct('Camera', {
    position: Wgsl.type('vec3<f32>'),
    view_matrix: Wgsl.type('mat4x4<f32>'),
    projection_matrix: Wgsl.type('mat4x4<f32>'),
    view_projection_matrix: Wgsl.type('mat4x4<f32>'),
});

export const DirLight: DirLightStruct = Wgsl.struct('DirLight', {
    direction: Wgsl.type('vec3<f32>'),
    color: Wgsl.type('vec3<f32>'),
    intensity: Wgsl.type('f32'),
});

export const MAX_DIR_LIGHTS: MAX_DIR_LIGHTS_TYPE = 3;

export const Scene: SceneStruct = Wgsl.struct('Scene', {
    camera: Camera,
    dirLights: Wgsl.array(DirLight, MAX_DIR_LIGHTS),
});

export const Transform: TransformStruct = Wgsl.struct('Transform', {
    model_matrix: Wgsl.type('mat4x4<f32>'),
    normal_matrix: Wgsl.type('mat4x4<f32>'),
});

export const PhongMaterial: PhongMaterialStruct = Wgsl.struct('PhongMaterial', {
    diffuse_color: Wgsl.type('vec3<f32>'),
    specular_color: Wgsl.type('vec3<f32>'),
    opacity: Wgsl.type('f32'),
});

export const PhongEntity: PhongEntityStruct = Wgsl.struct('Entity', {
    transform: Transform,
    material: PhongMaterial,
});
