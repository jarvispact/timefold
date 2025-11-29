import { Component, createComponent } from '@timefold/ecs';
import { Mat4x4, Mat4x4Type } from '@timefold/math';
import { EngineComponentType, OrthographicCameraComponent, OrthographicCameraData } from './types';
import { ParsedGltf2CameraOrthographic } from '@timefold/gltf2';

export const type = EngineComponentType.OrthographicCamera;

export function is(component: Component): component is OrthographicCameraComponent {
    return component.type === type;
}

type CreateArgs = {
    left: number;
    right: number;
    bottom: number;
    top: number;
    near: number;
    far: number;
};

export function create(args: CreateArgs): OrthographicCameraComponent {
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
}

export function update(out: OrthographicCameraData, args: CreateArgs) {
    Mat4x4.ortho(out.projectionMatrix, args.left, args.right, args.bottom, args.top, args.near, args.far);
    Mat4x4.multiplication(out.viewProjectionMatrix, out.projectionMatrix, out.viewMatrix);
    return out;
}

type CreateFromGltf2Args = {
    camera: ParsedGltf2CameraOrthographic;
    aspect?: number;
};

export function createFromGltf2({ camera, aspect }: CreateFromGltf2Args): OrthographicCameraComponent {
    const component = create({ left: 0, right: 0, bottom: 0, top: 0, near: 0, far: 0 });
    updateFromGltf2(component.data, camera, aspect);
    return component;
}

export function updateFromModelMatrix(out: OrthographicCameraData, modelMatrix: Mat4x4Type) {
    Mat4x4.invert(out.viewMatrix, modelMatrix);
    Mat4x4.multiplication(out.viewProjectionMatrix, out.projectionMatrix, out.viewMatrix);
    return out;
}

export function updateFromGltf2(out: OrthographicCameraData, camera: ParsedGltf2CameraOrthographic, aspect?: number) {
    const originalAspect = camera.projection.xmag / camera.projection.ymag;
    let adjustedXmag, adjustedYmag;

    if (aspect !== undefined) {
        if (aspect > originalAspect) {
            // Screen is wider than the original camera
            // Keep ymag constant, adjust xmag
            adjustedYmag = camera.projection.ymag;
            adjustedXmag = camera.projection.ymag * aspect;
        } else {
            // Screen is taller than the original camera
            // Keep xmag constant, adjust ymag
            adjustedXmag = camera.projection.xmag;
            adjustedYmag = camera.projection.xmag / aspect;
        }
    } else {
        adjustedXmag = camera.projection.xmag;
        adjustedYmag = camera.projection.ymag;
    }

    const left = -adjustedXmag;
    const right = adjustedXmag;
    const bottom = -adjustedYmag;
    const top = adjustedYmag;
    const near = camera.projection.znear;
    const far = camera.projection.zfar;

    Mat4x4.ortho(out.projectionMatrix, left, right, bottom, top, near, far);
    Mat4x4.multiplication(out.viewProjectionMatrix, out.projectionMatrix, out.viewMatrix);
    return out;
}
