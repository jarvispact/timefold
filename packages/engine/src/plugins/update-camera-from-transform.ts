import { createPlugin, createSystem } from '@timefold/ecs';
import { OrthographicCamera, PerspectiveCamera } from '../components';
import { EngineWorld } from '../types';

export const UpdateCameraFromTransformPlugin = createPlugin<EngineWorld>({
    fn: (world) => {
        const query = world.createQuery({
            query: { tuple: [{ has: '@tf/Transform' }, { or: ['@tf/PerspectiveCamera', '@tf/OrthographicCamera'] }] },
            map: ([transform, camera]) => ({ modelMatrix: transform.data.modelMatrix, camera }),
        });

        const fn = () => {
            for (const { modelMatrix, camera } of query) {
                if (PerspectiveCamera.isPerspective(camera)) {
                    PerspectiveCamera.updateFromModelMatrix(camera, modelMatrix);
                } else {
                    OrthographicCamera.updateFromModelMatrix(camera, modelMatrix);
                }
            }
        };

        const Startup = createSystem({
            stage: 'startup',
            fn,
        });

        const Update = createSystem({
            stage: 'after-update',
            fn,
        });

        world.registerSystems([Startup, Update]);
    },
});
