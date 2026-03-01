import { MathUtils } from '@timefold/math';
import { createComponent, PerspectiveCameraComponent } from './types';

export const type = 'PerspectiveCamera' as const;

type CreateArgs = {
    aspect: number;
    fovy?: number;
    near?: number;
    far?: number;
};

export const create = (args: CreateArgs): PerspectiveCameraComponent => {
    return createComponent('PerspectiveCamera', {
        aspect: args.aspect,
        fovy: args.fovy ?? MathUtils.degreesToRadians(65),
        near: args.near ?? 0.1,
        far: args.far ?? 10000.0,
    });
};
