import { Component } from '@timefold/ecs';
import { Vec3 } from '@timefold/math';

export const type = '@timefold/DirLight';

export type DirLightData = {
    direction: Vec3.Type;
    color: Vec3.Type;
    intensity: number;
};

export type DirLightComponent = Component.Type<typeof type, DirLightData>;

export type CreateArgs = {
    direction: Vec3.Type;
    color?: Vec3.Type;
    intensity?: number;
};

export const create = (args: CreateArgs): DirLightComponent => {
    return Component.create(type, {
        direction: args.direction,
        color: args.color ?? Vec3.one(),
        intensity: args.intensity ?? 1.0,
    });
};
