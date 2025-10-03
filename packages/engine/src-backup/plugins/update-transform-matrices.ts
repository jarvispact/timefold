import { createPlugin, createSystem } from '@timefold/ecs';
import { Transform } from '../components';
import { EngineWorld } from '../types';

export const UpdateTransformMatricesPlugin = createPlugin<EngineWorld>({
    fn: (world) => {
        const updateAabbQuery = world.createQuery({ query: { tuple: [{ has: '@tf/Transform' }] } });

        const UpdateSystem = createSystem({
            stage: 'after-update',
            fn: () => {
                for (const [transform] of updateAabbQuery) {
                    Transform.updateMatrices(transform);
                }
            },
        });

        world.registerSystems(UpdateSystem);
    },
});
