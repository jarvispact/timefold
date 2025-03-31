import { createComponent } from '@timefold/ecs';
import { Mat4x4, Mat4x4Type } from '@timefold/math';
import { OrthographicCameraComponent, OrthographicCameraType, PerspectiveCameraComponent } from './types';
import { ParsedGltf2CameraOrthographic } from '@timefold/gltf2';

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

type CreateFromGltf2Args = {
    camera: ParsedGltf2CameraOrthographic;
    aspect: number;
};

export const createFromGltf2 = ({ camera, aspect }: CreateFromGltf2Args): OrthographicCameraComponent => {
    const component = create({ left: 0, right: 0, bottom: 0, top: 0, near: 0, far: 0 });
    return updateFromGltf2(component, camera, aspect);
};

export const updateFromModelMatrix = (out: OrthographicCameraComponent, modelMatrix: Mat4x4Type) => {
    Mat4x4.invert(out.data.viewMatrix, modelMatrix);
    Mat4x4.multiplication(out.data.viewProjectionMatrix, out.data.projectionMatrix, out.data.viewMatrix);
    return out;
};

export const updateFromGltf2 = (
    out: OrthographicCameraComponent,
    camera: ParsedGltf2CameraOrthographic,
    aspect: number,
) => {
    const originalAspect = camera.projection.xmag / camera.projection.ymag;
    let adjustedXmag, adjustedYmag;

    // Adjust magnification based on screen aspect ratio
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

    const left = -adjustedXmag;
    const right = adjustedXmag;
    const bottom = -adjustedYmag;
    const top = adjustedYmag;
    const near = camera.projection.znear;
    const far = camera.projection.zfar;

    Mat4x4.ortho(out.data.projectionMatrix, left, right, bottom, top, near, far);
    Mat4x4.multiplication(out.data.viewProjectionMatrix, out.data.projectionMatrix, out.data.viewMatrix);
    return out;
};

export const isOrthographic = (
    out: PerspectiveCameraComponent | OrthographicCameraComponent,
): out is OrthographicCameraComponent => out.type === type;
