import { createComponent } from '@timefold/ecs';
import { Vec3, Vec3Type } from '@timefold/math';
import { PhongMaterialComponent, T } from './types';

export const type = T.PhongMaterial;

type CreateArgs = {
    diffuseColor?: Vec3Type;
    specularColor?: Vec3Type;
    shininess?: number;
    specularStrength?: number;
    opacity?: number;
};

export const create = (args: CreateArgs = {}): PhongMaterialComponent => {
    return createComponent(type, {
        ambientColor: Vec3.fromScalar(0.1),
        diffuseColor: args.diffuseColor ?? Vec3.fromScalar(0.7),
        specularColor: args.specularColor ?? Vec3.fromScalar(0.2),
        shininess: args.shininess ?? 32,
        opacity: args.opacity ?? 1.0,
    });
};
