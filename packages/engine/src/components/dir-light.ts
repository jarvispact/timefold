import { Vec3, Vec3Type } from '@timefold/math';
import { DirLightComponent, engineRegistry } from './types';

export const type = engineRegistry.DirLight.type;

type CreateArgs = {
    direction: Vec3Type;
    color?: Vec3Type;
    intensity?: number;
};

export const create = (args: CreateArgs): DirLightComponent => {
    const direction = args.direction;
    const color = args.color ?? Vec3.one();
    const intensity = args.intensity ?? 1;

    return engineRegistry.DirLight.create({
        direction,
        color,
        intensity,
    });
};
