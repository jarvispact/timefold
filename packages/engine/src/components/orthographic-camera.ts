import { createComponent } from '@timefold/ecs';
import { Mat4x4, Mat4x4Type } from '@timefold/math';
import { OrthographicCameraComponent, OrthographicCameraType, PerspectiveCameraComponent } from './types';

export const type: OrthographicCameraType = '@tf/OrthographicCamera';

type CreateArgs = {
    left: number;
    right: number;
    bottom: number;
    top: number;
    near: number;
    far: number;
};

export const create = (args: CreateArgs): OrthographicCameraComponent => {
    const viewMatrix = Mat4x4.create();
    const projectionMatrix = Mat4x4.create();
    const viewProjectionMatrix = Mat4x4.create();

    Mat4x4.inverted(viewMatrix);
    Mat4x4.ortho(projectionMatrix, args.left, args.right, args.bottom, args.top, args.near, args.far);
    Mat4x4.multiplication(viewProjectionMatrix, projectionMatrix, viewMatrix);

    return createComponent(type, {
        ...args,
        viewMatrix,
        projectionMatrix,
        viewProjectionMatrix,
    });
};

export const updateFromModelMatrix = (out: OrthographicCameraComponent, modelMatrix: Mat4x4Type) => {
    Mat4x4.invert(out.data.viewMatrix, modelMatrix);
    Mat4x4.multiplication(out.data.viewProjectionMatrix, out.data.projectionMatrix, out.data.viewMatrix);
    return out;
};

export const isOrthographic = (
    out: PerspectiveCameraComponent | OrthographicCameraComponent,
): out is OrthographicCameraComponent => out.type === type;
