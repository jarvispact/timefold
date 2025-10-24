import { Component, createComponent } from '@timefold/ecs';
import { Vec3, Vec3Type } from '@timefold/math';
import { MtlMaterial } from '@timefold/obj';
import { EngineComponentType, PhongMaterialComponent } from './types';

export const type = EngineComponentType.PhongMaterial;

export function is(component: Component): component is PhongMaterialComponent {
    return component.type === type;
}

export type CreateArgs = {
    diffuseColor?: Vec3Type;
    specularColor?: Vec3Type;
    shininess?: number;
    specularStrength?: number;
    opacity?: number;
    diffuseMap?: ImageBitmap;
};

export function create(args: CreateArgs = {}): PhongMaterialComponent {
    return createComponent(type, {
        diffuseColor: args.diffuseColor ?? Vec3.create(0.7, 0.7, 0.7),
        specularColor: args.specularColor ?? Vec3.create(0.2, 0.2, 0.2),
        shininess: args.shininess ?? 32,
        opacity: args.opacity ?? 1.0,
        diffuseMap: args.diffuseMap,
    });
}

export function fromMtlMaterial(mtlMaterial: MtlMaterial): PhongMaterialComponent {
    return create({
        diffuseColor: mtlMaterial.diffuseColor,
        specularColor: mtlMaterial.specularColor,
        specularStrength: mtlMaterial.specularExponent,
        diffuseMap: mtlMaterial.diffuseMap,
    });
}
