import { Component, createComponent } from '@timefold/ecs';
import { Vec3, Mat4x4, Quat, Vec3Type, QuatType } from '@timefold/math';
import { EngineComponentType, TransformComponent } from './types';

export const type = EngineComponentType.Transform;

export function is(component: Component): component is TransformComponent {
    return component.type === type;
}

type CreateFromTRSArgs = {
    translation: Vec3Type;
    rotation?: QuatType;
    scale?: Vec3Type;
};

export function createFromTRS(args: CreateFromTRSArgs): TransformComponent {
    const translation = args.translation;
    const rotation = args.rotation ?? Quat.createIdentity();
    const scale = args.scale ?? Vec3.one();

    const modelMatrix = Mat4x4.createFromRotationTranslationScale(rotation, translation, scale);

    return createComponent(type, {
        translation,
        rotation,
        scale,
        modelMatrix,
    });
}

type CreateAndLookAtArgs = {
    translation: Vec3Type;
    target: Vec3Type;
    up?: Vec3Type;
};

export function createAndLookAt({ translation, target, up = Vec3.up() }: CreateAndLookAtArgs): TransformComponent {
    const rotation = Quat.create(0, 0, 0, 1);
    const scale = Vec3.one();
    const modelMatrix = Mat4x4.createFromRotationTranslationScale(rotation, translation, scale);

    Mat4x4.targetTo(modelMatrix, translation, target, up);
    Mat4x4.extractRotation(rotation, modelMatrix);

    return createComponent(type, {
        translation,
        rotation,
        scale,
        modelMatrix,
    });
}
