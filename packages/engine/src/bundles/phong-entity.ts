import { Mat4x4, Scalar, Vec3 } from '@timefold/math';
import { Data } from '../components';
import { PhongEntityStruct } from '../structs';
import { PhongEntityBundle } from './types';

export const create = (bundle: PhongEntityBundle) => {
    const { buffer, views } = bundle.data
        ? { buffer: bundle.data.data, views: PhongEntityStruct.fromBuffer(bundle.data.data) }
        : PhongEntityStruct.create({ mode: 'array-buffer' });

    const dataComponent = Data.create(buffer);

    Mat4x4.copy(views.transform.model_matrix, bundle.transform.data.modelMatrix);
    Mat4x4.copy(views.transform.normal_matrix, bundle.transform.data.normalMatrix);

    bundle.transform.data.modelMatrix = views.transform.model_matrix;
    bundle.transform.data.normalMatrix = views.transform.normal_matrix;

    Vec3.copy(views.material.diffuse_color, bundle.material.data.diffuseColor);
    Vec3.copy(views.material.specular_color, bundle.material.data.specularColor);
    Scalar.copy(views.material.opacity, bundle.material.data.opacity);

    bundle.material.data.diffuseColor = views.material.diffuse_color;
    bundle.material.data.specularColor = views.material.specular_color;
    bundle.material.data.opacity = views.material.opacity;

    return [...Object.values(bundle), dataComponent];
};
