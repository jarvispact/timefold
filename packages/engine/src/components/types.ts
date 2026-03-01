import { Component, defineComponents, InferComponents } from '@timefold/ecs';
import * as S from '@timefold/ecs/schema';

const TransformSchema = S.struct({
    translation: S.vec3,
    rotation: S.quat,
    scale: S.vec3,
});

const PhongMaterialSchema = S.struct({
    ambientColor: S.vec3,
    diffuseColor: S.vec3,
    specularColor: S.vec3,
    shininess: S.number,
    opacity: S.number,
});

const PerspectiveCameraSchema = S.struct({
    aspect: S.number,
    fovy: S.number,
    near: S.number,
    far: S.number,
});

const DirLightSchema = S.struct({
    direction: S.vec3,
    color: S.vec3,
    intensity: S.number,
});

export const engineComponents = defineComponents({
    Transform: TransformSchema,
    PhongMaterial: PhongMaterialSchema,
    PerspectiveCamera: PerspectiveCameraSchema,
    DirLight: DirLightSchema,
});

export type TransformData = S.InferSchemaType<typeof TransformSchema>;
export type TransformComponent = Component<'Transform', TransformData>;

export type PhongMaterialData = S.InferSchemaType<typeof PhongMaterialSchema>;
export type PhongMaterialComponent = Component<'PhongMaterial', PhongMaterialData>;

export type PerspectiveCameraData = S.InferSchemaType<typeof PerspectiveCameraSchema>;
export type PerspectiveCameraComponent = Component<'PerspectiveCamera', PerspectiveCameraData>;

export type DirLightData = S.InferSchemaType<typeof DirLightSchema>;
export type DirLightComponent = Component<'DirLight', DirLightData>;

export type EngineComponent = InferComponents<typeof engineComponents>;
