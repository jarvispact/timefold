import { MathUtils } from '@timefold/math';
import { PerspectiveCameraComponent } from './types';
import { createComponent } from '@timefold/ecs';

export const type: PerspectiveCameraComponent['type'] = 'PerspectiveCamera';

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
