import { Component, createComponent } from '@timefold/ecs';
import { Mat4x4, Quat, Vec2, Vec2Type, Vec3 } from '@timefold/math';
import { EngineComponentType, Transform2DComponent } from './types';

export const type = EngineComponentType.Transform2D;

export function is(component: Component): component is Transform2DComponent {
    return component.type === type;
}

type CreateFromTRSArgs = {
    translation: Vec2Type;
    rotation?: number;
    scale?: Vec2Type;
};

export function createFromTRS(args: CreateFromTRSArgs): Transform2DComponent {
    const translation = args.translation;
    const rotation = args.rotation ?? 0;
    const scale = args.scale ?? Vec2.one();

    const halfAngle = rotation * 0.5;

    const modelMatrix = Mat4x4.createFromRotationTranslationScale(
        Quat.create(0, 0, Math.sin(halfAngle), Math.cos(halfAngle)),
        Vec3.fromVec2(translation, 0),
        Vec3.fromVec2(scale, 1),
    );

    return createComponent(type, {
        translation,
        rotation,
        scale,
        modelMatrix,
    });
}
