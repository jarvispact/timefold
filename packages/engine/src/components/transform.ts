import { createComponent } from '@timefold/ecs';
import { Vec3, Mat4x4, Quat, Vec3Type, QuatType } from '@timefold/math';
import { TransformComponent, TransformType } from './types';

export const type: TransformType = '@tf/Transform';

type CreateFromTRSArgs = {
    translation: Vec3Type;
    rotation?: QuatType;
    scale?: Vec3Type;
};

export const createFromTRS = (args: CreateFromTRSArgs): TransformComponent => {
    const translation = args.translation;
    const rotation = args.rotation ?? Quat.createIdentity();
    const scale = args.scale ?? Vec3.one();

    const modelMatrix = Mat4x4.createFromRotationTranslationScale(rotation, translation, scale);
    const normalMatrix = Mat4x4.create();
    Mat4x4.transpose(normalMatrix, modelMatrix);
    Mat4x4.inverted(normalMatrix);

    return createComponent(type, {
        translation,
        rotation,
        scale,
        modelMatrix,
        normalMatrix,
    });
};

type CreateAndLookAtArgs = {
    translation: Vec3Type;
    target: Vec3Type;
    up?: Vec3Type;
};

export const createAndLookAt = ({ translation, target, up = Vec3.up() }: CreateAndLookAtArgs): TransformComponent => {
    const rotation = Quat.create(0, 0, 0, 1);
    const scale = Vec3.one();
    const modelMatrix = Mat4x4.createFromRotationTranslationScale(rotation, translation, scale);

    Mat4x4.targetTo(modelMatrix, translation, target, up);
    Mat4x4.extractRotation(rotation, modelMatrix);

    const normalMatrix = Mat4x4.create();
    Mat4x4.transpose(normalMatrix, modelMatrix);
    Mat4x4.inverted(normalMatrix);

    return createComponent(type, {
        translation,
        rotation,
        scale,
        modelMatrix,
        normalMatrix,
    });
};

export const updateMatrices = (out: TransformComponent) => {
    Mat4x4.fromRotationTranslationScale(out.data.modelMatrix, out.data.rotation, out.data.translation, out.data.scale);
    Mat4x4.modelToNormal(out.data.normalMatrix, out.data.modelMatrix);
    return out;
};
