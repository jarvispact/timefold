import { Component } from '@timefold/ecs';
import { Vec3, Mat4x4, Quat } from '@timefold/math';

export const type = '@timefold/Transform';
export type TransformType = typeof type;

export type TransformData = {
    translation: Vec3.Type;
    rotation: Quat.Type;
    scale: Vec3.Type;
    modelMatrix: Mat4x4.Type;
    normalMatrix: Mat4x4.Type;
};

export type TransformComponent = Component.Type<TransformType, TransformData>;

export type CreateFromTRSArgs = {
    translation: Vec3.Type;
    rotation?: Quat.Type;
    scale?: Vec3.Type;
};

export const createFromTRS = (args: CreateFromTRSArgs): TransformComponent => {
    const translation = args.translation;
    const rotation = args.rotation ?? Quat.createIdentity();
    const scale = args.scale ?? Vec3.one();

    const modelMatrix = Mat4x4.createFromRotationTranslationScale(rotation, translation, scale);
    const normalMatrix = Mat4x4.create();
    Mat4x4.transpose(normalMatrix, modelMatrix);
    Mat4x4.inverted(normalMatrix);

    return Component.create(type, {
        translation,
        rotation,
        scale,
        modelMatrix,
        normalMatrix,
    });
};

export const createAndLookAt = (
    translation: Vec3.Type,
    target: Vec3.Type,
    up: Vec3.Type = Vec3.up(),
): TransformComponent => {
    const rotation = Quat.create(0, 0, 0, 1);
    const scale = Vec3.one();
    const modelMatrix = Mat4x4.createFromRotationTranslationScale(rotation, translation, scale);

    Mat4x4.targetTo(modelMatrix, translation, target, up);
    Mat4x4.extractRotation(rotation, modelMatrix);

    const normalMatrix = Mat4x4.create();
    Mat4x4.transpose(normalMatrix, modelMatrix);
    Mat4x4.inverted(normalMatrix);

    return Component.create(type, {
        translation,
        rotation,
        scale,
        modelMatrix,
        normalMatrix,
    });
};
