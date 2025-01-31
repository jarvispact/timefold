import { EcsEvent, World } from '@timefold/ecs';
import { EngineComponent } from './components/types';
import { InferWgslStructResult, WgslArray, WgslStruct, WgslType } from '@timefold/webgpu';

// Structs

export type CameraStruct = WgslStruct<
    'Camera',
    {
        position: WgslType<'vec3<f32>'>;
        view_matrix: WgslType<'mat4x4<f32>'>;
        projection_matrix: WgslType<'mat4x4<f32>'>;
        view_projection_matrix: WgslType<'mat4x4<f32>'>;
    }
>;

export type DirLightStruct = WgslStruct<
    'DirLight',
    {
        direction: WgslType<'vec3<f32>'>;
        color: WgslType<'vec3<f32>'>;
        intensity: WgslType<'f32'>;
    }
>;

export type MAX_DIR_LIGHTS_TYPE = 3;

export type SceneStruct = WgslStruct<
    'Scene',
    {
        camera: CameraStruct;
        dirLights: WgslArray<DirLightStruct, MAX_DIR_LIGHTS_TYPE>;
    }
>;

export type TransformStruct = WgslStruct<
    'Transform',
    {
        model_matrix: WgslType<'mat4x4<f32>'>;
        normal_matrix: WgslType<'mat4x4<f32>'>;
    }
>;

export type PhongMaterialStruct = WgslStruct<
    'PhongMaterial',
    {
        diffuse_color: WgslType<'vec3<f32>'>;
        specular_color: WgslType<'vec3<f32>'>;
        opacity: WgslType<'f32'>;
    }
>;

export type PhongEntityStruct = WgslStruct<
    'Entity',
    {
        transform: TransformStruct;
        material: PhongMaterialStruct;
    }
>;

// World

export type EngineEvent = EcsEvent<EngineComponent[]>;

export type SceneData = InferWgslStructResult<SceneStruct>;

export type EngineResources = {
    scene: {
        maxDirLights: number;
        currentDirLight: number;
        data: SceneData;
    };
};

export type EngineWorld = World<EngineComponent, EngineEvent, EngineResources>;
