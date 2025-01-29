import { Event, World } from '@timefold/ecs';
import { EngineComponent } from './components/types';
import { Wgsl } from '@timefold/webgpu';

// Structs

export type CameraStruct = Wgsl.Struct<
    'Camera',
    {
        position: Wgsl.Type<'vec3<f32>'>;
        view_matrix: Wgsl.Type<'mat4x4<f32>'>;
        projection_matrix: Wgsl.Type<'mat4x4<f32>'>;
        view_projection_matrix: Wgsl.Type<'mat4x4<f32>'>;
    }
>;

export type DirLightStruct = Wgsl.Struct<
    'DirLight',
    {
        direction: Wgsl.Type<'vec3<f32>'>;
        color: Wgsl.Type<'vec3<f32>'>;
        intensity: Wgsl.Type<'f32'>;
    }
>;

export type MAX_DIR_LIGHTS_TYPE = 3;

export type SceneStruct = Wgsl.Struct<
    'Scene',
    {
        camera: CameraStruct;
        dirLights: Wgsl.Array<DirLightStruct, MAX_DIR_LIGHTS_TYPE>;
    }
>;

export type TransformStruct = Wgsl.Struct<
    'Transform',
    {
        model_matrix: Wgsl.Type<'mat4x4<f32>'>;
        normal_matrix: Wgsl.Type<'mat4x4<f32>'>;
    }
>;

export type PhongMaterialStruct = Wgsl.Struct<
    'PhongMaterial',
    {
        diffuse_color: Wgsl.Type<'vec3<f32>'>;
        specular_color: Wgsl.Type<'vec3<f32>'>;
        opacity: Wgsl.Type<'f32'>;
    }
>;

export type PhongEntityStruct = Wgsl.Struct<
    'Entity',
    {
        transform: TransformStruct;
        material: PhongMaterialStruct;
    }
>;

// World

export type EngineEvent = Event.EcsEvent<EngineComponent[]>;

export type SceneData = Wgsl.InferStructResult<SceneStruct>;

export type EngineResources = {
    scene: {
        maxDirLights: number;
        currentDirLight: number;
        data: SceneData;
    };
};

export type EngineWorld = World.World<EngineComponent, EngineEvent, EngineResources>;
