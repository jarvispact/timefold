import { Scalar, Vec3 } from '@timefold/math';
import { BundleWorld, DirLightBundle } from './types';

export const create = (bundle: DirLightBundle) => (world: BundleWorld) => {
    const scene = world.getResource('scene');

    const color = Vec3.createCopy(bundle.dirLight.data.color);
    const direction = Vec3.createCopy(bundle.dirLight.data.direction);
    const intensity = Scalar.createCopy(bundle.dirLight.data.intensity);

    bundle.dirLight.data.color = scene.data.views.dir_lights[scene.currentDirLight].color;
    bundle.dirLight.data.direction = scene.data.views.dir_lights[scene.currentDirLight].direction;
    bundle.dirLight.data.intensity = scene.data.views.dir_lights[scene.currentDirLight].intensity;

    Vec3.copy(bundle.dirLight.data.color, color);
    Vec3.copy(bundle.dirLight.data.direction, direction);
    Scalar.copy(bundle.dirLight.data.intensity, intensity);

    scene.currentDirLight = scene.currentDirLight + 1;
    world.setResource('scene', scene);

    return Object.values(bundle);
};
