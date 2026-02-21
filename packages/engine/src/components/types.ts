import { Component, componentRegistry, InferComponents, InferSchemaType, number, struct } from '@timefold/ecs';
import { quat, vec3 } from '../math-schemas';

const TransformSchema = struct('Transform', {
    translation: vec3,
    rotation: quat,
    scale: vec3,
});

const PhongMaterialSchema = struct('PhongMaterial', {
    ambientColor: vec3,
    diffuseColor: vec3,
    specularColor: vec3,
    shininess: number,
    opacity: number,
});

const PerspectiveCameraSchema = struct('PerspectiveCamera', {
    aspect: number,
    fovy: number,
    near: number,
    far: number,
});

const DirLightSchema = struct('DirLight', {
    direction: vec3,
    color: vec3,
    intensity: number,
});

export const {
    T,
    components: engineComponents,
    registry: engineRegistry,
} = componentRegistry([
    {
        name: 'Transform',
        definition: TransformSchema,
    },
    {
        name: 'PhongMaterial',
        definition: PhongMaterialSchema,
    },
    {
        name: 'PerspectiveCamera',
        definition: PerspectiveCameraSchema,
    },
    {
        name: 'DirLight',
        definition: DirLightSchema,
    },
]);

export type TransformData = InferSchemaType<typeof TransformSchema>;
export type TransformComponent = Component<typeof T.Transform, TransformData>;

export type PhongMaterialData = InferSchemaType<typeof PhongMaterialSchema>;
export type PhongMaterialComponent = Component<typeof T.PhongMaterial, PhongMaterialData>;

export type PerspectiveCameraData = InferSchemaType<typeof PerspectiveCameraSchema>;
export type PerspectiveCameraComponent = Component<typeof T.PerspectiveCamera, PerspectiveCameraData>;

export type DirLightData = InferSchemaType<typeof DirLightSchema>;
export type DirLightComponent = Component<typeof T.DirLight, DirLightData>;

export type EngineComponent = InferComponents<typeof engineComponents>;
