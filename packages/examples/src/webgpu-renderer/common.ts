import { Uniform, Wgsl } from '@timefold/webgpu';

export const DirLightStruct = Wgsl.struct('DirLight', {
    direction: Wgsl.type('vec3<f32>'),
    color: Wgsl.type('vec3<f32>'),
    intensity: Wgsl.type('f32'),
});

export const MAX_DIR_LIGHTS = 4;
export const DirLightStructArray = Wgsl.fixedSizeArray(DirLightStruct, MAX_DIR_LIGHTS);

export const CameraStruct = Wgsl.struct('Camera', {
    position: Wgsl.type('vec3<f32>'),
    view_projection_matrix: Wgsl.type('mat4x4<f32>'),
});

export const FrameStruct = Wgsl.struct('Frame', {
    dir_lights: DirLightStructArray,
    camera: CameraStruct,
});

export const FrameUniformGroup = Uniform.group(0, {
    frame: Uniform.uniformBuffer(0, FrameStruct),
});

export const TransformStruct = Wgsl.struct('Transform', {
    model_matrix: Wgsl.type('mat4x4<f32>'),
    normal_matrix: Wgsl.type('mat4x4<f32>'),
});

export const TransformUniformGroup = Uniform.group(2, {
    transform: Uniform.uniformBuffer(0, TransformStruct),
});
