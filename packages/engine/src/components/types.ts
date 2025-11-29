import { Component, defineComponentTypes } from '@timefold/ecs';
import { EasingFunction, Mat4x4Type, QuatType, Vec2Type, Vec3Type } from '@timefold/math';
import {
    SupportedPositionFormat,
    SupportedFormat,
    GenericIndexBufferTypedArray,
    AttribFormatToTypedArray,
} from '@timefold/webgpu';

const ComponentTypes = defineComponentTypes([
    'Transform2D',
    'Transform3D',
    'Renderable',
    'UnlitMaterial',
    'PhongMaterial',
    'InterleavedPrimitive',
    'NonInterleavedPrimitive',
    'Animation',
    'PerspectiveCamera',
    'OrthographicCamera',
    'MainCameraTag',
]);

export const EngineComponentType = ComponentTypes.T;
export const EngineComponentTypeNames = ComponentTypes.typeNames;

// #region Transform2D
export type Transform2DData = {
    translation: Vec2Type;
    rotation: number;
    scale: Vec2Type;
    modelMatrix: Mat4x4Type;
};

export type Transform2DComponent = Component<typeof EngineComponentType.Transform2D, Transform2DData>;
// #endregion

// #region Transform3D
export type Transform3DData = {
    translation: Vec3Type;
    rotation: QuatType;
    scale: Vec3Type;
    modelMatrix: Mat4x4Type;
};

export type Transform3DComponent = Component<typeof EngineComponentType.Transform3D, Transform3DData>;
// #endregion

// #region Renderable
export type RenderableData = {
    layer: number;
};

export type RenderableComponent = Component<typeof EngineComponentType.Renderable, RenderableData>;
// #endregion

// #region UnlitMaterial
export type UnlitMaterialData = {
    color: Vec3Type;
    opacity: number;
    useColorMapAlpha: number;
    colorMap?: ImageBitmap;
};

export type UnlitMaterialComponent = Component<typeof EngineComponentType.UnlitMaterial, UnlitMaterialData>;
// #endregion

// #region PhongMaterial
export type PhongMaterialData = {
    diffuseColor: Vec3Type;
    specularColor: Vec3Type;
    shininess: number;
    opacity: number;
    diffuseMap?: ImageBitmap;
};

export type PhongMaterialComponent = Component<typeof EngineComponentType.PhongMaterial, PhongMaterialData>;
// #endregion

// #region InterleavedPrimitive
export type InterleavedLayout = {
    position: { format: SupportedPositionFormat; stride: number };
} & Record<string, { format: SupportedFormat; stride: number }>;

export type InterleavedPrimitiveData = {
    layout: InterleavedLayout;
    primitive: GPUPrimitiveState;
    vertices: Float32Array;
    indices?: GenericIndexBufferTypedArray;
};

export type InterleavedPrimitiveComponent = Component<
    typeof EngineComponentType.InterleavedPrimitive,
    InterleavedPrimitiveData
>;
// #endregion

// #region NonInterleavedPrimitive
export type NonInterleavedAttributes = {
    position: { format: SupportedPositionFormat; data: Float32Array };
} & Record<string, { [K in SupportedFormat]: { format: K; data: AttribFormatToTypedArray<K> } }[SupportedFormat]>;

export type NonInterleavedPrimitiveData<Attribs extends NonInterleavedAttributes = NonInterleavedAttributes> = {
    primitive: GPUPrimitiveState;
    attributes: Attribs;
    indices?: GenericIndexBufferTypedArray;
};

export type NonInterleavedPrimitiveComponent<Attribs extends NonInterleavedAttributes = NonInterleavedAttributes> =
    Component<typeof EngineComponentType.NonInterleavedPrimitive, NonInterleavedPrimitiveData<Attribs>>;
// #endregion

// #region Animation
export type AnimationKeyframe<Value> = {
    time: number;
    value: Value;
    easing: EasingFunction;
};

export type ScalarAnimationTrack = {
    type: 'scalar';
    initialValue: number;
    keyframes: AnimationKeyframe<number>[];
};

export type Vec2AnimationTrack = {
    type: 'vec2';
    initialValue: Vec2Type;
    keyframes: AnimationKeyframe<Vec2Type>[];
};

export type Vec3AnimationTrack = {
    type: 'vec3';
    initialValue: Vec3Type;
    keyframes: AnimationKeyframe<Vec3Type>[];
};

export type QuatAnimationTrack = {
    type: 'quat';
    initialValue: QuatType;
    keyframes: AnimationKeyframe<QuatType>[];
};

export type AnimationTrack = ScalarAnimationTrack | Vec2AnimationTrack | Vec3AnimationTrack | QuatAnimationTrack;

export type AnimationData<Tracks extends Record<string, AnimationTrack> = Record<string, AnimationTrack>> = {
    duration: number;
    time: number;
    tracks: Tracks;
    trackKeys: (keyof Tracks)[];
    playing: boolean;
    loop: boolean;
};

export type AnimationComponent<Tracks extends Record<string, AnimationTrack> = Record<string, AnimationTrack>> =
    Component<typeof EngineComponentType.Animation, AnimationData<Tracks>>;
// #endregion

// #region PerspectiveCamera
export type PerspectiveCameraData = {
    aspect: number;
    fovy: number;
    near: number;
    far: number | undefined;
    viewMatrix: Mat4x4Type;
    projectionMatrix: Mat4x4Type;
    viewProjectionMatrix: Mat4x4Type;
};

export type PerspectiveCameraComponent = Component<typeof EngineComponentType.PerspectiveCamera, PerspectiveCameraData>;
// #endregion

// #region OrthographicCamera
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

export type OrthographicCameraComponent = Component<
    typeof EngineComponentType.OrthographicCamera,
    OrthographicCameraData
>;
// #endregion

export type MainCameraTagComponent = Component<typeof EngineComponentType.MainCameraTag>;

export type EngineComponent =
    | Transform2DComponent
    | Transform3DComponent
    | RenderableComponent
    | UnlitMaterialComponent
    | PhongMaterialComponent
    | InterleavedPrimitiveComponent
    | NonInterleavedPrimitiveComponent
    | AnimationComponent
    | PerspectiveCameraComponent
    | OrthographicCameraComponent
    | MainCameraTagComponent;
