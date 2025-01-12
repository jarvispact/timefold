import { Plugin, System } from '@timefold/ecs';
import { EngineWorld } from '../types';
import { PerspectiveCamera } from '../components';

export const UpdateCameraFromTransformPlugin = Plugin.create<EngineWorld>({
    fn: (world) => {
        const query = world.createQuery(
            {
                tuple: [{ has: '@timefold/Transform' }, { has: '@timefold/PerspectiveCamera' }],
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
