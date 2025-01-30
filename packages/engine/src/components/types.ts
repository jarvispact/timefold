import { Component } from '@timefold/ecs';
import { Vec3Type, ScalarType, Mat4x4Type, QuatType } from '@timefold/math';

// Data

export type DataType = '@tf/Data';
export type DataComponent<B extends ArrayBufferLike = ArrayBuffer> = Component<DataType, B>;

// DirLight

export type DirLightType = '@tf/DirLight';

export type DirLightData = {
    direction: Vec3Type;
    color: Vec3Type;
    intensity: ScalarType;
};

export type DirLightComponent = Component<DirLightType, DirLightData>;

// PerspectiveCamera

export type PerspectiveCameraType = '@tf/PerspectiveCamera';

export type PerspectiveCameraData = {
    aspect: number;
    fovy: number;
    near: number;
    far: number | undefined;
    viewMatrix: Mat4x4Type;
    projectionMatrix: Mat4x4Type;
    viewProjectionMatrix: Mat4x4Type;
};

export type PerspectiveCameraComponent = Component<PerspectiveCameraType, PerspectiveCameraData>;

// PhongMaterial

export type PhongMaterialType = '@tf/PhongMaterial';

export type PhongMaterialData = {
    diffuseColor: Vec3Type;
    specularColor: Vec3Type;
    opacity: ScalarType;
};

export type PhongMaterialComponent = Component<PhongMaterialType, PhongMaterialData>;

// Transform

export type TransformType = '@tf/Transform';

export type TransformData = {
    translation: Vec3Type;
    rotation: QuatType;
    scale: Vec3Type;
    modelMatrix: Mat4x4Type;
    normalMatrix: Mat4x4Type;
};

export type TransformComponent = Component<TransformType, TransformData>;

// EngineComponent

export type EngineComponent =
    | TransformComponent
    | PerspectiveCameraComponent
    | DirLightComponent
    | PhongMaterialComponent
    | DataComponent;
