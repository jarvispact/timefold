import { Component, createWorld as createEcsWorld, GenericEcsEvent, EcsEvent, World } from '@timefold/ecs';
import { EngineComponent } from './components/types';
import { EngineResources, SceneData } from './types';
import { MAX_DIR_LIGHTS, Scene } from './structs';

type CreateArgs = {
    sceneData?: SceneData;
};

export const createWorld = <
    WorldComponent extends Component = EngineComponent,
    WorldEvent extends GenericEcsEvent = EcsEvent<WorldComponent[]>,
    WorldResources extends EngineResources = EngineResources,
>(
    args: CreateArgs = {},
): World<WorldComponent, WorldEvent, WorldResources> => {
    const world = createEcsWorld<WorldComponent, WorldEvent, WorldResources>();

    world.setResource('scene', {
        maxDirLights: MAX_DIR_LIGHTS,
        currentDirLight: 0,
        data: args.sceneData ?? Scene.create({ mode: 'array-buffer' }),
    });

    return world;
};
