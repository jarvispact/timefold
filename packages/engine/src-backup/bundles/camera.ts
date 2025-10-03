import { Mat4x4, Vec3 } from '@timefold/math';
import { CameraStruct } from '../structs';
import { CameraBundle } from './types';
import { Data } from '../components';

export const create = (bundle: CameraBundle) => {
    const { buffer, views } = bundle.data
        ? { buffer: bundle.data.data, views: CameraStruct.fromBuffer(bundle.data.data) }
        : CameraStruct.create({ mode: 'array-buffer' });

    const dataComponent = Data.create(buffer);

    const p = Vec3.createCopy(bundle.transform.data.translation);
    const vm = Mat4x4.createCopy(bundle.camera.data.viewMatrix);
    const pm = Mat4x4.createCopy(bundle.camera.data.projectionMatrix);
    const vpm = Mat4x4.createCopy(bundle.camera.data.viewProjectionMatrix);

    bundle.transform.data.translation = views.position;
    bundle.camera.data.viewMatrix = views.view_matrix;
    bundle.camera.data.projectionMatrix = views.projection_matrix;
    bundle.camera.data.viewProjectionMatrix = views.view_projection_matrix;

    Vec3.copy(bundle.transform.data.translation, p);
    Mat4x4.copy(bundle.camera.data.viewMatrix, vm);
    Mat4x4.copy(bundle.camera.data.projectionMatrix, pm);
    Mat4x4.copy(bundle.camera.data.viewProjectionMatrix, vpm);

    return [...Object.values(bundle), dataComponent];
};
