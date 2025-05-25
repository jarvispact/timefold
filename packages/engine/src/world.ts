import {
    Component,
    createWorld as createEcsWorld,
    GenericEcsEvent,
    EcsEvent,
    World,
    WorldOptions as EcsWorldOptions,
} from '@timefold/ecs';
import { EngineComponent } from './components/types';
import { EngineResources, SceneData } from './types';
import { MAX_DIR_LIGHTS, SceneStruct } from './structs';

type WorldOptions = Partial<EcsWorldOptions> & {
    sceneData?: SceneData;
};

export const createWorld = <
    WorldComponent extends Component = EngineComponent,
    WorldEvent extends GenericEcsEvent = EcsEvent<WorldComponent[]>,
    WorldResources extends EngineResources = EngineResources,
>(
    options: WorldOptions = {},
): World<WorldComponent, WorldEvent, WorldResources> => {
    const world = createEcsWorld<WorldComponent, WorldEvent, WorldResources>(options);

    world.setResource('engine', {
        frame: {
            maxDirLights: MAX_DIR_LIGHTS,
            currentDirLight: 0,
            data: options.sceneData ?? SceneStruct.create({ mode: 'array-buffer' }),
        },
    });

    return world;
};
