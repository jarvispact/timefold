import { Component } from '@timefold/ecs';
import { Vec3, Scalar } from '@timefold/math';
import { DirLightComponent, DirLightType } from './types';

export const type: DirLightType = '@tf/DirLight';

type CreateArgs = {
    direction: Vec3.Type;
    color?: Vec3.Type;
    intensity?: number;
};

export const create = (args: CreateArgs): DirLightComponent => {
    return Component.create(type, {
        direction: args.direction,
        color: args.color ?? Vec3.one(),
        intensity: Scalar.create(args.intensity ?? 1.0),
    });
};
