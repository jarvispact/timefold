import { Component, defineComponentTypes } from '@timefold/ecs';
import { QuatType, Vec3Type } from '@timefold/math';

// Types

export const { T, Types, ByName } = defineComponentTypes(['Transform', 'DirLight', 'Data']);

// Transform

export type TransformData = {
    position: Vec3Type;
    rotation: QuatType;
    scale: Vec3Type;
};

export type TransformStructData = {
    position: Float32Array;
    rotation: Float32Array;
    scale: Float32Array;
};

export type TransformComponent = Component<typeof T.Transform, TransformData | TransformStructData>;

// DirLight

export type DirLightData = {
    direction: Vec3Type;
    color: Vec3Type;
    intensity: number;
};

export type DirLightStructData = {
    direction: Float32Array;
    color: Float32Array;
    intensity: Uint32Array;
};

export type DirLightComponent = Component<typeof T.DirLight, DirLightData | DirLightStructData>;

// Data

export type DataComponent = Component<typeof T.Data, ArrayBufferLike>;

// Union

export type EngineComponent = TransformComponent | DirLightComponent | DataComponent;
