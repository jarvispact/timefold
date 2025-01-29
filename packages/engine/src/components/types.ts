import { Component } from '@timefold/ecs';
import { Vec3, Scalar, Mat4x4, Quat } from '@timefold/math';

// Data

export type DataType = '@tf/Data';
export type DataComponent<B extends ArrayBufferLike = ArrayBuffer> = Component.Type<DataType, B>;

// DirLight

export type DirLightType = '@tf/DirLight';

export type DirLightData = {
    direction: Vec3.Type;
    color: Vec3.Type;
    intensity: Scalar.Type;
};

export type DirLightComponent = Component.Type<DirLightType, DirLightData>;

// PerspectiveCamera

export type PerspectiveCameraType = '@tf/PerspectiveCamera';

export type PerspectiveCameraData = {
    aspect: number;
    fovy: number;
    near: number;
    far: number | undefined;
    viewMatrix: Mat4x4.Type;
    projectionMatrix: Mat4x4.Type;
    viewProjectionMatrix: Mat4x4.Type;
};

export type PerspectiveCameraComponent = Component.Type<PerspectiveCameraType, PerspectiveCameraData>;

// PhongMaterial

export type PhongMaterialType = '@tf/PhongMaterial';

export type PhongMaterialData = {
    diffuseColor: Vec3.Type;
    specularColor: Vec3.Type;
    opacity: Scalar.Type;
};

export type PhongMaterialComponent = Component.Type<PhongMaterialType, PhongMaterialData>;

// Transform

export type TransformType = '@tf/Transform';

export type TransformData = {
    translation: Vec3.Type;
    rotation: Quat.Type;
    scale: Vec3.Type;
    modelMatrix: Mat4x4.Type;
    normalMatrix: Mat4x4.Type;
};

export type TransformComponent = Component.Type<TransformType, TransformData>;

// EngineComponent

export type EngineComponent =
    | TransformComponent
    | PerspectiveCameraComponent
    | DirLightComponent
    | PhongMaterialComponent
    | DataComponent;
