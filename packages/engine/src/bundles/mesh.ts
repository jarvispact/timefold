import { Mat4x4, Scalar, Vec3 } from '@timefold/math';
import { MeshBundle } from './types';
import { TransformStruct, PhongMaterialStruct, UnlitMaterialStruct } from '../structs';
import { MeshData, PhongMaterial, PhongMaterialType, UnlitMaterial, UnlitMaterialType } from '../components';
import { Component } from '@timefold/ecs';

const isUnlitMaterial = (component: Component): component is Component<UnlitMaterialType, number> =>
    component.type === UnlitMaterial.type;

const isPhongMaterial = (component: Component): component is Component<PhongMaterialType, number> =>
    component.type === PhongMaterial.type;

export const create = (bundle: MeshBundle) => {
    const transform = TransformStruct.create();
    Mat4x4.copy(transform.views.model_matrix, bundle.transform.data.modelMatrix);
    Mat4x4.copy(transform.views.normal_matrix, bundle.transform.data.normalMatrix);
    bundle.transform.data.modelMatrix = transform.views.model_matrix;
    bundle.transform.data.normalMatrix = transform.views.normal_matrix;

    const materials: ArrayBufferLike[] = [];

    for (const { material } of bundle.mesh.data) {
        if (isUnlitMaterial(material)) {
            const { buffer, views } = UnlitMaterialStruct.create();

            Vec3.copy(views.color, material.data.color);
            Scalar.copy(views.opacity, material.data.opacity);
            Scalar.copy(views.use_colormap_alpha, material.data.useColorMapAlpha);

            material.data.color = views.color;
            material.data.opacity = views.opacity;
            material.data.useColorMapAlpha = views.use_colormap_alpha;

            materials.push(buffer);
        } else if (isPhongMaterial(material)) {
            const { buffer, views } = PhongMaterialStruct.create();

            Vec3.copy(views.diffuse_color, material.data.diffuseColor);
            Vec3.copy(views.specular_color, material.data.specularColor);
            Scalar.copy(views.opacity, material.data.opacity);

            material.data.diffuseColor = views.diffuse_color;
            material.data.specularColor = views.specular_color;
            material.data.opacity = views.opacity;

            materials.push(buffer);
        }
    }

    return [...Object.values(bundle), MeshData.create({ transform: transform.buffer, materials })];
};
