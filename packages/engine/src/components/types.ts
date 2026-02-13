import { Component, defineComponentTypes } from '@timefold/ecs';
import { QuatType, Vec3Type } from '@timefold/math';

// Types

export const { T, Types, ByName } = defineComponentTypes([
    'Transform',
    'PhongMaterial',
    'PerspectiveCamera',
    'DirLight',
]);

// Transform

export type TransformData = {
    translation: Vec3Type;
    rotation: QuatType;
    scale: Vec3Type;
};

export type TransformComponent = Component<typeof T.Transform, TransformData>;

// PhongMaterial

export type PhongMaterialData = {
    ambientColor: Vec3Type;
    diffuseColor: Vec3Type;
    specularColor: Vec3Type;
    shininess: number;
    opacity: number;
};

export type PhongMaterialComponent = Component<typeof T.PhongMaterial, PhongMaterialData>;

// PerspectiveCamera

export type PerspectiveCameraData = {
    aspect: number;
    fovy: number;
    near: number;
    far: number | undefined;
};

export type PerspectiveCameraComponent = Component<typeof T.PerspectiveCamera, PerspectiveCameraData>;

// DirLight

export type DirLightData = {
    direction: Vec3Type;
    color: Vec3Type;
    intensity: number;
};

export type DirLightComponent = Component<typeof T.DirLight, DirLightData>;

// Union

export type EngineComponent =
    | TransformComponent
    | PhongMaterialComponent
    | PerspectiveCameraComponent
    | DirLightComponent;
