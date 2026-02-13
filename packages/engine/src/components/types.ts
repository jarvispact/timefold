import { Component, defineComponentTypes } from '@timefold/ecs';
import { QuatType, Vec3Type } from '@timefold/math';

// Types

export const { T, Types, ByName } = defineComponentTypes(['Transform', 'DirLight']);

// Transform

export type TransformData = {
    position: Vec3Type;
    rotation: QuatType;
    scale: Vec3Type;
};

export type TransformComponent = Component<typeof T.Transform, TransformData>;

// DirLight

export type DirLightData = {
    direction: Vec3Type;
    color: Vec3Type;
    intensity: number;
};

export type DirLightComponent = Component<typeof T.DirLight, DirLightData>;

// Union

export type EngineComponent = TransformComponent | DirLightComponent;
