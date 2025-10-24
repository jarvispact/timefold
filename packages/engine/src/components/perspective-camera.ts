import { Component, createComponent } from '@timefold/ecs';
import { Mat4x4, Mat4x4Type, MathUtils } from '@timefold/math';
import { EngineComponentType, PerspectiveCameraComponent, PerspectiveCameraData } from './types';

export const type = EngineComponentType.PerspectiveCamera;

export function is(component: Component): component is PerspectiveCameraComponent {
    return component.type === type;
}

type CreateArgs = {
    aspect: number;
    fovy?: number;
    near?: number;
    far?: number;
};

export function create(args: CreateArgs): PerspectiveCameraComponent {
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

    return createComponent(type, {
        aspect,
        fovy,
        near,
        far,
        viewMatrix,
        projectionMatrix,
        viewProjectionMatrix,
    });
}

type CreateFromModelMatrixArgs = CreateArgs & { modelMatrix: Mat4x4Type };

export function createFromModelMatrix(args: CreateFromModelMatrixArgs): PerspectiveCameraComponent {
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

    return createComponent(type, {
        aspect,
        fovy,
        near,
        far,
        viewMatrix,
        projectionMatrix,
        viewProjectionMatrix,
    });
}

export function updateFromModelMatrix(out: PerspectiveCameraData, modelMatrix: Mat4x4Type) {
    Mat4x4.invert(out.viewMatrix, modelMatrix);
    Mat4x4.multiplication(out.viewProjectionMatrix, out.projectionMatrix, out.viewMatrix);
    return out;
}

export function updateFromAspect(out: PerspectiveCameraData, aspect: number) {
    out.aspect = aspect;
    Mat4x4.perspective(out.projectionMatrix, out.fovy, aspect, out.near, out.far);
    Mat4x4.multiplication(out.viewProjectionMatrix, out.projectionMatrix, out.viewMatrix);
    return out;
}
