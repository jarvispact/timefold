import { createComponent } from '@timefold/ecs';
import { Scalar, Vec3, Vec3Type } from '@timefold/math';
import { UnlitMaterialComponent, UnlitMaterialType } from './types';

export const type: UnlitMaterialType = '@tf/UnlitMaterial';

type CreateArgs = {
    color?: Vec3Type;
    opacity?: number;
    colorMap?: ImageBitmap;
    useColorMapAlpha?: boolean;
};

export const create = (args: CreateArgs = {}): UnlitMaterialComponent => {
    return createComponent(type, {
        color: args.color ?? (args.colorMap ? Vec3.zero() : Vec3.create(1, 1, 1)),
        colorMap: args.colorMap,
        opacity: Scalar.create(args.opacity ?? 1),
        useColorMapAlpha: Scalar.create(args.useColorMapAlpha && args.colorMap ? 1 : 0),
    });
};
