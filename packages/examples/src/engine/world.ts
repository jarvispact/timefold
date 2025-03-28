import { createWorld, EngineComponent } from '@timefold/engine';
import { DefineEcsEvent, EcsEvent } from '@timefold/ecs';

type WorldComponent = EngineComponent | { type: 'Rotation'; data: number };

type CustomEvent1 = DefineEcsEvent<'Foo'>;
type CustomEvent2 = DefineEcsEvent<'Bar', { data: [number, number] }>;

type WorldEvent = CustomEvent1 | CustomEvent2 | EcsEvent<WorldComponent[]>;

export const world = createWorld<WorldComponent, WorldEvent>();

export type World = typeof world;
