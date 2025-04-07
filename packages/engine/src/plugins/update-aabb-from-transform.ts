import { createPlugin, createSystem } from '@timefold/ecs';
import { Vec3 } from '@timefold/math';
import { Aabb } from '../components';
import { EngineWorld } from '../types';

export const UpdateAabbFromTransformPlugin = createPlugin<EngineWorld>({
    fn: (world) => {
        const updateAabbQuery = world.createQuery({
            query: { tuple: [{ has: '@tf/Transform' }, { has: '@tf/Aabb' }] },
            map: ([transform, aabb]) => ({
                translation: transform.data.translation,
                scale: transform.data.scale,
                aabb,
            }),
        });

        const tmpHalf = Vec3.zero();
        const tmpMin = Vec3.zero();
        const tmpMax = Vec3.zero();

        const Startup = createSystem({
            stage: 'startup',
            fn: () => {
                for (const { translation, scale, aabb } of updateAabbQuery) {
                    Vec3.set(tmpHalf, Math.abs(scale[0]), Math.abs(scale[1]), Math.abs(scale[2]));
                    Vec3.subtraction(tmpMin, translation, tmpHalf);
                    Vec3.addition(tmpMax, translation, tmpHalf);
                    Aabb.set(aabb, tmpMin, tmpMax);
                }
            },
        });

        const Update = createSystem({
            stage: 'update',
            fn: () => {
                for (const { translation, scale, aabb } of updateAabbQuery) {
                    Vec3.set(tmpHalf, Math.abs(scale[0]), Math.abs(scale[1]), Math.abs(scale[2]));
                    Vec3.subtraction(tmpMin, translation, tmpHalf);
                    Vec3.addition(tmpMax, translation, tmpHalf);
                    Aabb.set(aabb, tmpMin, tmpMax);
                }
            },
        });

        world.registerSystems([Startup, Update]);
    },
});
