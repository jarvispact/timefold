import { Scalar, Vec3 } from '@timefold/math';
import { BundleWorld, DirLightBundle } from './types';

export const create = (bundle: DirLightBundle) => (world: BundleWorld) => {
    const engine = world.getResource('engine');

    const color = Vec3.createCopy(bundle.dirLight.data.color);
    const direction = Vec3.createCopy(bundle.dirLight.data.direction);
    const intensity = Scalar.createCopy(bundle.dirLight.data.intensity);

    bundle.dirLight.data.color = engine.frame.data.views.dir_lights[engine.frame.currentDirLight].color;
    bundle.dirLight.data.direction = engine.frame.data.views.dir_lights[engine.frame.currentDirLight].direction;
    bundle.dirLight.data.intensity = engine.frame.data.views.dir_lights[engine.frame.currentDirLight].intensity;

    Vec3.copy(bundle.dirLight.data.color, color);
    Vec3.copy(bundle.dirLight.data.direction, direction);
    Scalar.copy(bundle.dirLight.data.intensity, intensity);

    engine.frame.currentDirLight = engine.frame.currentDirLight + 1;
    world.setResource('engine', engine);

    return Object.values(bundle);
};
