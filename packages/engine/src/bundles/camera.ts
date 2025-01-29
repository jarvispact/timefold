import { Mat4x4, Vec3 } from '@timefold/math';
import { BundleWorld, CameraBundle } from './types';

export const create = (bundle: CameraBundle) => (world: BundleWorld) => {
    const scene = world.getResource('scene');

    const p = Vec3.createCopy(bundle.transform.data.translation);
    const vm = Mat4x4.createCopy(bundle.camera.data.viewMatrix);
    const pm = Mat4x4.createCopy(bundle.camera.data.projectionMatrix);
    const vpm = Mat4x4.createCopy(bundle.camera.data.viewProjectionMatrix);

    bundle.transform.data.translation = scene.data.views.camera.position;
    bundle.camera.data.viewMatrix = scene.data.views.camera.view_matrix;
    bundle.camera.data.projectionMatrix = scene.data.views.camera.projection_matrix;
    bundle.camera.data.viewProjectionMatrix = scene.data.views.camera.view_projection_matrix;

    Vec3.copy(bundle.transform.data.translation, p);
    Mat4x4.copy(bundle.camera.data.viewMatrix, vm);
    Mat4x4.copy(bundle.camera.data.projectionMatrix, pm);
    Mat4x4.copy(bundle.camera.data.viewProjectionMatrix, vpm);

    return Object.values(bundle);
};
