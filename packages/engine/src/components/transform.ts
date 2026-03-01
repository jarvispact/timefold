import { Mat3, Quat, QuatType, Vec3, Vec3Type } from '@timefold/math';
import { TransformComponent, TransformData } from './types';
import { createComponent } from '@timefold/ecs';

export const type = 'Transform' as const;

type CreateArgs = {
    translation?: Vec3Type;
    rotation?: QuatType;
    scale?: Vec3Type;
};

export const create = (args: CreateArgs = {}): TransformComponent => {
    const translation = args.translation ?? Vec3.zero();
    const rotation = args.rotation ?? Quat.create();
    const scale = args.scale ?? Vec3.one();
    return createComponent('Transform', { translation, rotation, scale });
};

type CreateAndLookAtArgs = {
    translation?: Vec3Type;
    scale?: Vec3Type;
    target: Vec3Type;
    up?: Vec3Type;
};

export const createAndLookAt = (args: CreateAndLookAtArgs): TransformComponent => {
    const transform = create(args);
    lookAt(transform.data, args.target, args.up);
    return transform;
};

export const lookAt = (out: TransformData, target: Vec3Type, up: Vec3Type = Vec3.up()): TransformData => {
    const f = Vec3.normalize(Vec3.subtraction(Vec3.create(), out.translation, target));
    const r = Vec3.normalize(Vec3.crossProduct(Vec3.create(), up, f));
    const u = Vec3.crossProduct(Vec3.create(), f, r);

    const mat3 = Mat3.create(r, u, f);
    Quat.fromMat3(out.rotation, mat3);

    return out;
};

export const extractForward = (out: Vec3Type, transform: TransformData): Vec3Type => {
    return Vec3.transformQuat(out, Vec3.forward(), transform.rotation);
};
