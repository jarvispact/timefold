import { Component } from '@timefold/ecs';
import { Vec3Type, ScalarType, Mat4x4Type, QuatType } from '@timefold/math';

// Aabb

export type AabbType = '@tf/Aabb';

export type AabbData = {
    min: Vec3Type;
    center: Vec3Type;
    max: Vec3Type;
};

export type AabbComponent = Component<AabbType, AabbData>;

export type AabbCollisionDirection = 'left' | 'right' | 'up' | 'bottom' | 'near' | 'far';

export type AabbCollisionResult =
    | { collided: false; direction: undefined }
    | { collided: true; direction: AabbCollisionDirection };

// Clock

export type ClockType = '@tf/Clock';

export type ClockData = {
    autoStart: boolean;
    startTime: number;
    oldTime: number;
    elapsedTime: number;
    running: boolean;
    paused: boolean;
};

export type ClockComponent = Component<ClockType, ClockData>;

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

// OrthographicCamera

export type OrthographicCameraType = '@tf/OrthographicCamera';

export type OrthographicCameraData = {
    left: number;
    right: number;
    bottom: number;
    top: number;
    near: number;
    far: number;
    viewMatrix: Mat4x4Type;
    projectionMatrix: Mat4x4Type;
    viewProjectionMatrix: Mat4x4Type;
};

export type OrthographicCameraComponent = Component<OrthographicCameraType, OrthographicCameraData>;

// UnlitMaterial

export type UnlitMaterialType = '@tf/UnlitMaterial';

export type UnlitMaterialData = {
    color: Vec3Type;
    opacity: ScalarType;
    useColorMapAlpha: ScalarType;
    colorMap?: ImageBitmap;
};

export type UnlitMaterialComponent = Component<UnlitMaterialType, UnlitMaterialData>;

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
    | AabbComponent
    | TransformComponent
    | PerspectiveCameraComponent
    | OrthographicCameraComponent
    | DirLightComponent
    | UnlitMaterialComponent
    | PhongMaterialComponent
    | DataComponent
    | ClockComponent;
