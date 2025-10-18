import { Component, defineComponentTypes } from '@timefold/ecs';
import { EasingFunction, QuatType, Vec2Type, Vec3Type } from '@timefold/math';

const ComponentTypes = defineComponentTypes(['Position2D', 'Rotation2D', 'Scale2D', 'Clock', 'Animation']);

export const EngineComponentType = ComponentTypes.T;
export const EngineComponentTypeNames = ComponentTypes.typeNames;

export type Position2DComponent = Component<typeof EngineComponentType.Position2D, Vec2Type>;
export type Rotation2DComponent = Component<typeof EngineComponentType.Rotation2D, number>;
export type Scale2DComponent = Component<typeof EngineComponentType.Scale2D, Vec2Type>;

export type ClockData = {
    autoStart: boolean;
    startTime: number;
    oldTime: number;
    elapsedTime: number;
    running: boolean;
    paused: boolean;
};

export type ClockComponent = Component<typeof EngineComponentType.Clock, ClockData>;

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

export type EngineComponent = Position2DComponent | Rotation2DComponent | ClockComponent | AnimationComponent;
