import { Mat4x4, Scalar, Vec3 } from '@timefold/math';
import { Data } from '../components';
import { UnlitEntityStruct } from '../structs';
import { UnlitEntityBundle } from './types';

export const create = (bundle: UnlitEntityBundle) => {
    const { buffer, views } = bundle.data
        ? { buffer: bundle.data.data, views: UnlitEntityStruct.fromBuffer(bundle.data.data) }
        : UnlitEntityStruct.create({ mode: 'array-buffer' });

    const dataComponent = Data.create(buffer);

    Mat4x4.copy(views.transform.model_matrix, bundle.transform.data.modelMatrix);
    Mat4x4.copy(views.transform.normal_matrix, bundle.transform.data.normalMatrix);

    bundle.transform.data.modelMatrix = views.transform.model_matrix;
    bundle.transform.data.normalMatrix = views.transform.normal_matrix;

    Vec3.copy(views.material.color, bundle.material.data.color);
    Scalar.copy(views.material.opacity, bundle.material.data.opacity);
    Scalar.copy(views.material.use_colormap_alpha, bundle.material.data.useColorMapAlpha);

    bundle.material.data.color = views.material.color;
    bundle.material.data.opacity = views.material.opacity;
    bundle.material.data.useColorMapAlpha = views.material.use_colormap_alpha;

    return [...Object.values(bundle), dataComponent];
};
