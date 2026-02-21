import { MathUtils } from '@timefold/math';
import { PerspectiveCameraComponent, engineRegistry } from './types';

export const type = engineRegistry.PerspectiveCamera.type;

type CreateArgs = {
    aspect: number;
    fovy?: number;
    near?: number;
    far?: number;
};

export const create = (args: CreateArgs): PerspectiveCameraComponent => {
    return engineRegistry.PerspectiveCamera.create({
        aspect: args.aspect,
        fovy: args.fovy ?? MathUtils.degreesToRadians(65),
        near: args.near ?? 0.1,
        far: args.far ?? 10000.0,
    });
};
