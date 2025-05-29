import { EcsEvent, World } from '@timefold/ecs';
import { EngineComponent } from './components/types';
import { InferWgslArrayResult } from '@timefold/webgpu';
import { DirLightStructArray } from './structs';

export type EngineEvent = EcsEvent<EngineComponent[]>;

export type EngineResources = {
    engine: {
        frame: {
            maxDirLights: number;
            currentDirLight: number;
            dirLightData: InferWgslArrayResult<typeof DirLightStructArray>;
        };
    };
};

export type EngineWorld = World<EngineComponent, EngineEvent, EngineResources>;
