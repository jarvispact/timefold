import { Vec3, Vec3Type } from '@timefold/math';
import { DirLightComponent } from './types';
import { createComponent } from '@timefold/ecs';

export const type: DirLightComponent['type'] = 'DirLight';

type CreateArgs = {
    direction: Vec3Type;
    color?: Vec3Type;
    intensity?: number;
};

export const create = (args: CreateArgs): DirLightComponent => {
    const direction = args.direction;
    const color = args.color ?? Vec3.one();
    const intensity = args.intensity ?? 1;

    return createComponent('DirLight', {
        direction,
        color,
        intensity,
    });
};
