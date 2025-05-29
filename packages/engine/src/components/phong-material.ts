import { createComponent } from '@timefold/ecs';
import { Scalar, Vec3, Vec3Type } from '@timefold/math';
import { PhongMaterialComponent, PhongMaterialType } from './types';

export const type: PhongMaterialType = '@tf/PhongMaterial';

export type CreateArgs = {
    diffuseColor?: Vec3Type;
    specularColor?: Vec3Type;
    shininess?: number;
    specularStrength?: number;
    opacity?: number;
};

export const create = (args: CreateArgs = {}): PhongMaterialComponent => {
    return createComponent(type, {
        diffuseColor: args.diffuseColor ?? Vec3.create(0.7, 0.7, 0.7),
        specularColor: args.specularColor ?? Vec3.create(0.2, 0.2, 0.2),
        shininess: Scalar.create(args.shininess ?? 32),
        opacity: Scalar.create(args.opacity ?? 1.0),
    });
};
