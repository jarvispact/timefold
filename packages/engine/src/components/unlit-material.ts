import { createComponent } from '@timefold/ecs';
import { Scalar, Vec3, Vec3Type } from '@timefold/math';
import { UnlitMaterialComponent, UnlitMaterialType } from './types';

export const type: UnlitMaterialType = '@tf/UnlitMaterial';

type CreateArgs = {
    color?: Vec3Type;
    opacity?: number;
};

export const create = (args: CreateArgs = {}): UnlitMaterialComponent => {
    return createComponent(type, {
        color: args.color ?? Vec3.create(0.7, 0.7, 0.7),
        opacity: Scalar.create(args.opacity ?? 1.0),
    });
};
