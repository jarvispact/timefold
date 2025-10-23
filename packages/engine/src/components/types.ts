import { Component, defineComponentTypes } from '@timefold/ecs';
import { EasingFunction, QuatType, Vec2Type, Vec3Type } from '@timefold/math';
import {
    SupportedPositionFormat,
    SupportedFormat,
    GenericIndexBufferTypedArray,
    AttribFormatToTypedArray,
} from '@timefold/webgpu';

const ComponentTypes = defineComponentTypes(['InterleavedPrimitive', 'NonInterleavedPrimitive', 'Animation']);

export const EngineComponentType = ComponentTypes.T;
export const EngineComponentTypeNames = ComponentTypes.typeNames;

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

export type EngineComponent = InterleavedPrimitiveComponent | NonInterleavedPrimitiveComponent | AnimationComponent;
