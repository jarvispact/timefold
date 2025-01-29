import { Component } from '@timefold/ecs';
import { Mat4x4, Mat4x4Type, MathUtils } from '@timefold/math';
import { PerspectiveCameraComponent, PerspectiveCameraType } from './types';

export const type: PerspectiveCameraType = '@tf/PerspectiveCamera';

type CreateArgs = {
    aspect: number;
    fovy?: number;
    near?: number;
    far?: number;
};

export const create = (args: CreateArgs): PerspectiveCameraComponent => {
    const aspect = args.aspect;
    const fovy = args.fovy ?? MathUtils.degreesToRadians(65);
    const near = args.near ?? 0.1;
    const far = args.far;

    const viewMatrix = Mat4x4.create();
    const projectionMatrix = Mat4x4.create();
    const viewProjectionMatrix = Mat4x4.create();

    Mat4x4.inverted(viewMatrix);
    Mat4x4.perspective(projectionMatrix, fovy, aspect, near, far);
    Mat4x4.multiplication(viewProjectionMatrix, projectionMatrix, viewMatrix);

    return Component.create(type, {
        aspect,
        fovy,
        near,
        far,
        viewMatrix,
        projectionMatrix,
        viewProjectionMatrix,
    });
};

type CreateFromModelMatrixArgs = CreateArgs & { modelMatrix: Mat4x4Type };

export const createFromModelMatrix = (args: CreateFromModelMatrixArgs): PerspectiveCameraComponent => {
    const aspect = args.aspect;
    const fovy = args.fovy ?? MathUtils.degreesToRadians(65);
    const near = args.near ?? 0.1;
    const far = args.far;

    const viewMatrix = Mat4x4.create();
    const projectionMatrix = Mat4x4.create();
    const viewProjectionMatrix = Mat4x4.create();

    Mat4x4.invert(viewMatrix, args.modelMatrix);
    Mat4x4.perspective(projectionMatrix, fovy, aspect, near, far);
    Mat4x4.multiplication(viewProjectionMatrix, projectionMatrix, viewMatrix);

    return Component.create(type, {
        aspect,
        fovy,
        near,
        far,
        viewMatrix,
        projectionMatrix,
        viewProjectionMatrix,
    });
};

export const updateFromModelMatrix = (out: PerspectiveCameraComponent, modelMatrix: Mat4x4Type) => {
    Mat4x4.invert(out.data.viewMatrix, modelMatrix);
    Mat4x4.multiplication(out.data.viewProjectionMatrix, out.data.projectionMatrix, out.data.viewMatrix);
    return out;
};

export const updateFromAspect = (out: PerspectiveCameraComponent, aspect: number) => {
    out.data.aspect = aspect;
    Mat4x4.perspective(out.data.projectionMatrix, out.data.fovy, aspect, out.data.near, out.data.far);
    Mat4x4.multiplication(out.data.viewProjectionMatrix, out.data.projectionMatrix, out.data.viewMatrix);
    return out;
};
