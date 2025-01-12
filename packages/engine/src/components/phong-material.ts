import { Component } from '@timefold/ecs';
import { Vec3 } from '@timefold/math';

export const type = '@timefold/PhongMaterial';

export type PhongData = {
    diffuseColor: Vec3.Type;
    specularColor: Vec3.Type;
    opacity: number;
};

export type PhongComponent = Component.Type<typeof type, PhongData>;

export type CreateArgs = {
    diffuseColor?: Vec3.Type;
    specularColor?: Vec3.Type;
    opacity?: number;
};

export const create = (args: CreateArgs = {}): PhongComponent => {
    return Component.create(type, {
        diffuseColor: args.diffuseColor ?? Vec3.create(0.7, 0.7, 0.7),
        specularColor: args.specularColor ?? Vec3.create(0.9, 0.9, 0.9),
        opacity: args.opacity ?? 1.0,
    });
};
