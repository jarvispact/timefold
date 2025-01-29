import { Component, Event, World } from '@timefold/ecs';
import { EngineComponent } from './components/types';
import { EngineResources, SceneData } from './types';
import { MAX_DIR_LIGHTS, Scene } from './structs';

type CreateArgs = {
    sceneData?: SceneData;
};

export const create = <
    WorldComponent extends Component.Type = EngineComponent,
    WorldEvent extends Event.Generic = Event.EcsEvent<WorldComponent[]>,
    WorldResources extends EngineResources = EngineResources,
>(
    args: CreateArgs = {},
): World.World<WorldComponent, WorldEvent, WorldResources> => {
    const world = World.create<WorldComponent, WorldEvent, WorldResources>();

    world.setResource('scene', {
        maxDirLights: MAX_DIR_LIGHTS,
        currentDirLight: 0,
        data: args.sceneData ?? Scene.create({ mode: 'array-buffer' }),
    });

    return world;
};
