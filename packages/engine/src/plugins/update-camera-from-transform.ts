import { createPlugin, createSystem } from '@timefold/ecs';
import { PerspectiveCamera } from '../components';
import { EngineWorld } from '../types';

export const UpdateCameraFromTransformPlugin = createPlugin<EngineWorld>({
    fn: (world) => {
        const query = world.createQuery({
            query: { tuple: [{ has: '@tf/Transform' }, { has: '@tf/PerspectiveCamera' }] },
            map: ([transform, camera]) => ({ modelMatrix: transform.data.modelMatrix, camera }),
        });

        const UpdateCameraSystem = createSystem({
            stage: 'after-update',
            fn: () => {
                for (const { modelMatrix, camera } of query) {
                    PerspectiveCamera.updateFromModelMatrix(camera, modelMatrix);
                }
            },
        });

        world.registerSystems(UpdateCameraSystem);
    },
});
