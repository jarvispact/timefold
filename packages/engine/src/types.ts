import { EcsEvent, World } from '@timefold/ecs';
import { EngineComponent } from './components/types';
import { InferWgslStructResult } from '@timefold/webgpu';
import { SceneStruct } from './structs';

export type EngineEvent = EcsEvent<EngineComponent[]>;

export type SceneData = InferWgslStructResult<typeof SceneStruct>;

export type EngineResources = {
    scene: {
        maxDirLights: number;
        currentDirLight: number;
        data: SceneData;
    };
};

export type EngineWorld = World<EngineComponent, EngineEvent, EngineResources>;
