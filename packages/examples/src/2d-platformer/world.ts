import { Component, EcsEvent } from '@timefold/ecs';
import { EngineComponent, EngineResources, createWorld } from '@timefold/engine';
import { InterleavedInfo } from '@timefold/obj';
import { Vec3Type } from '@timefold/math';

// TODO: If a vec3 is used as the data directly there is a type error
export type TargetPosition = Component<'TargetPosition', { position: Vec3Type }>;

type WorldComponent = EngineComponent | TargetPosition;

type WorldResources = EngineResources & {
    planeGeometry: { vertices: Float32Array; info: InterleavedInfo };
};

export const world = createWorld<WorldComponent, EcsEvent<WorldComponent[]>, WorldResources>();
export type World = typeof world;
