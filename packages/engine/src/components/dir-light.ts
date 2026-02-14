import { createComponent } from '@timefold/ecs';
import { Vec3, Vec3Type } from '@timefold/math';
import { DirLightComponent, T } from './types';

export const type = T.DirLight;

type CreateArgs = {
    direction: Vec3Type;
    color?: Vec3Type;
    intensity?: number;
};

export const create = (args: CreateArgs): DirLightComponent => {
    const direction = args.direction;
    const color = args.color ?? Vec3.one();
    const intensity = args.intensity ?? 1;

    return createComponent(type, {
        direction,
        color,
        intensity,
    });
};
