import { Component } from '@timefold/ecs';
import { Vec3Type, ScalarType, Mat4x4Type, QuatType } from '@timefold/math';
import { SupportedPositionFormat, SupportedFormat } from '@timefold/webgpu';

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

// MeshData

export type MeshDataType = '@tf/MeshData';

export type MeshDataComponent<
    Transform extends ArrayBufferLike = ArrayBuffer,
    Materials extends ArrayBufferLike[] = ArrayBuffer[],
> = Component<MeshDataType, { transform: Transform; materials: Materials }>;

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
    shininess: ScalarType;
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

// Primitive

type GenericTypedIndexArray = Uint16Array | Uint32Array;

// InterleavedPrimitive

export type InterleavedPrimitiveType = '@tf/InterleavedPrimitive';

export type InterleavedLayout = {
    position: { format: SupportedPositionFormat; stride: number };
} & Record<string, { format: SupportedFormat; stride: number }>;

export type InterleavedPrimitiveData = {
    layout: InterleavedLayout;
    primitive: GPUPrimitiveState;
    vertices: Float32Array;
    indices?: GenericTypedIndexArray;
};

export type InterleavedPrimitiveComponent = Component<InterleavedPrimitiveType, InterleavedPrimitiveData>;

// NonInterleavedPrimitive

export type NonInterleavedPrimitiveType = '@tf/NonInterleavedPrimitive';

export type GenericTypedArray =
    | Int8Array
    | Uint8Array
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array
    | Float32Array;

export type NonInterleavedAttributes = {
    position: { format: SupportedPositionFormat; data: Float32Array };
} & Record<string, { format: SupportedFormat; data: GenericTypedArray }>;

export type NonInterleavedPrimitiveData = {
    primitive: GPUPrimitiveState;
    attributes: NonInterleavedAttributes;
    indices?: GenericTypedIndexArray;
};

export type NonInterleavedPrimitiveComponent = Component<NonInterleavedPrimitiveType, NonInterleavedPrimitiveData>;

// Unions

export type MaterialComponent = UnlitMaterialComponent | PhongMaterialComponent;

export type PrimitiveComponent = InterleavedPrimitiveComponent | NonInterleavedPrimitiveComponent;

// Mesh

export type MeshType = '@tf/Mesh';

export type MeshPart = {
    material: MaterialComponent;
    primitive: PrimitiveComponent;
};

export type MeshData = MeshPart[];

export type MeshComponent = Component<MeshType, MeshData>;

// EngineComponent

export type EngineComponent =
    | AabbComponent
    | TransformComponent
    | PerspectiveCameraComponent
    | OrthographicCameraComponent
    | DirLightComponent
    | MaterialComponent
    | DataComponent
    | MeshDataComponent
    | ClockComponent
    | PrimitiveComponent
    | MeshComponent;
