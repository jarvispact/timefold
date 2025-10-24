import { Component, createComponent } from '@timefold/ecs';
import { Vec3, Vec3Type } from '@timefold/math';
import { EngineComponentType, UnlitMaterialComponent } from './types';

export const type = EngineComponentType.UnlitMaterial;

export function is(component: Component): component is UnlitMaterialComponent {
    return component.type === type;
}

type CreateArgs = {
    color?: Vec3Type;
    opacity?: number;
    colorMap?: ImageBitmap;
    useColorMapAlpha?: boolean;
};

export function create(args: CreateArgs = {}): UnlitMaterialComponent {
    return createComponent(type, {
        color: args.color ?? Vec3.create(1, 1, 1),
        colorMap: args.colorMap,
        opacity: args.opacity ?? 1,
        useColorMapAlpha: args.useColorMapAlpha && args.colorMap ? 1 : 0,
    });
}
