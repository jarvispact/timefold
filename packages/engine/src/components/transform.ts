import { createComponent } from '@timefold/ecs';
import { Quat, QuatType, Vec3, Vec3Type } from '@timefold/math';
import { T, TransformComponent } from './types';

export const type = T.Transform;

type CreateArgs = {
    translation?: Vec3Type;
    rotation?: QuatType;
    scale?: Vec3Type;
};

export const create = (args: CreateArgs = {}): TransformComponent => {
    const translation = args.translation ?? Vec3.create();
    const rotation = args.rotation ?? Quat.create();
    const scale = args.scale ?? Vec3.create();

    return createComponent(type, {
        translation,
        rotation,
        scale,
    });
};
