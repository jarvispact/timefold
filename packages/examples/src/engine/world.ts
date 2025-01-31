import { createWorld, EngineComponent } from '@timefold/engine';

type WorldComponent = EngineComponent | { type: 'Rotation'; data: number };

export const world = createWorld<WorldComponent>();

export type World = typeof world;
