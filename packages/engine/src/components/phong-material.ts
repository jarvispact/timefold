import { Component } from '@timefold/ecs';
import { Scalar, Vec3, Vec3Type } from '@timefold/math';
import { PhongMaterialComponent, PhongMaterialType } from './types';

export const type: PhongMaterialType = '@tf/PhongMaterial';

export type CreateArgs = {
    diffuseColor?: Vec3Type;
    specularColor?: Vec3Type;
    opacity?: number;
};

export const create = (args: CreateArgs = {}): PhongMaterialComponent => {
    return Component.create(type, {
        diffuseColor: args.diffuseColor ?? Vec3.create(0.7, 0.7, 0.7),
        specularColor: args.specularColor ?? Vec3.create(0.9, 0.9, 0.9),
        opacity: Scalar.create(args.opacity ?? 1.0),
    });
};
