import { Plugin, System } from '@timefold/ecs';
import { PerspectiveCamera } from '../components';
import { EngineWorld } from '../types';

export const UpdateCameraFromTransformPlugin = Plugin.create<EngineWorld>({
    fn: (world) => {
        const query = world.createQuery(
            {
                tuple: [{ has: '@tf/Transform' }, { has: '@tf/PerspectiveCamera' }],
            },
            { map: ([transform, camera]) => ({ modelMatrix: transform.data.modelMatrix, camera }) },
        );

        const UpdateCameraSystem = System.create({
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
