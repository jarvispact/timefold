import { createPlugin, createSystem } from '@timefold/ecs';
import { OrthographicCamera, PerspectiveCamera } from '../components';
import { EngineWorld } from '../types';

export const UpdateCameraFromTransformPlugin = createPlugin<EngineWorld>({
    fn: (world) => {
        const query = world.createQuery({
            query: { tuple: [{ has: '@tf/Transform' }, { or: ['@tf/PerspectiveCamera', '@tf/OrthographicCamera'] }] },
            map: ([transform, camera]) => ({ modelMatrix: transform.data.modelMatrix, camera }),
        });

        const UpdateCameraSystem = createSystem({
            stage: 'after-update',
            order: 11,
            fn: () => {
                for (const { modelMatrix, camera } of query) {
                    if (PerspectiveCamera.isPerspective(camera)) {
                        PerspectiveCamera.updateFromModelMatrix(camera, modelMatrix);
                    } else {
                        OrthographicCamera.updateFromModelMatrix(camera, modelMatrix);
                    }
                }
            },
        });

        world.registerSystems(UpdateCameraSystem);
    },
});
