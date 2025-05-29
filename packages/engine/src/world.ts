import {
    Component,
    createWorld as createEcsWorld,
    GenericEcsEvent,
    EcsEvent,
    World,
    WorldOptions as EcsWorldOptions,
} from '@timefold/ecs';
import { EngineComponent } from './components/types';
import { EngineResources } from './types';
import { DirLightStructArray, MAX_DIR_LIGHTS } from './structs';
import { InferWgslArrayResult } from '@timefold/webgpu';

// TODO: Currently does not allow to set custom dirLightData because of MAX_DIR_LIGHTS in type.
type WorldOptions = Partial<EcsWorldOptions> & {
    dirLightData?: InferWgslArrayResult<typeof DirLightStructArray>;
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
            dirLightData: options.dirLightData ?? DirLightStructArray.create({ mode: 'array-buffer' }),
        },
    });

    return world;
};
