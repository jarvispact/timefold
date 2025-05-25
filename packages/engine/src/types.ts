import { EcsEvent, World } from '@timefold/ecs';
import { EngineComponent } from './components/types';
import { InferWgslStructResult } from '@timefold/webgpu';
import { SceneStruct } from './structs';

export type EngineEvent = EcsEvent<EngineComponent[]>;

// TODO: split scene struct into light types and camera
// Maybe camera not even needed as it is not an array and Data component
// can be spawned with the bundle independant
export type SceneData = InferWgslStructResult<typeof SceneStruct>;

export type EngineResources = {
    engine: {
        frame: {
            maxDirLights: number;
            currentDirLight: number;
            data: SceneData;
        };
    };
};

export type EngineWorld = World<EngineComponent, EngineEvent, EngineResources>;
