# @timefold/ecs
Fast and efficient, zero dependency ECS ( entity/component/system ) implementation.

## Info

`@timefold/ecs` is a very fast and memory efficient implementation of the ECS architecture. Strongly typed!

- A `component` holds your data in this shape: `{ type: string | number, data: any }`.
- A `entity` is just a id which can be of type `string | number`.
- A `query` is a list, where each entry consists of a set of components.
- A `system` operates on a query result and performs the game logic.

This separation of data and logic has many benefits:

- Separation of concerns. One system does just one thing.
- Express a wide variety of entities without complex inheritance.
- Cache locality. Up to 10x performance improvements when dealing with lots of entities.
- Easy multi threading. Run systems in parallel if they operate on different data.

## Quick start

Here is also a [stackblitz example](https://stackblitz.com/edit/timefold-ecs-demo?file=src%2Fmain.ts).

```ts
import { Component, createComponent, createSystem, createWorld } from '@timefold/ecs';
import { Vec2 } from '@timefold/math';

// Define your component types

type Position = Component<'Pos', [number, number]>;
type Velocity = Component<'Vel', [number, number]>;
type RenderTag = Component<'RenderTag'>;
type WorldComponent = Position | Velocity | RenderTag;

// Create a world

const world = createWorld<WorldComponent>();

// Define your queries
// TS Autocompletion in definitions and strongly typed results. Nice!

const physicsQuery = world.createQuery({
    query: { tuple: [{ has: 'Pos' }, { has: 'Vel' }] },
    map: ([pos, vel]) => ({ pos: pos.data, vel: vel.data }),
});

const renderQuery = world.createQuery({
    query: { includeId: true, tuple: [{ has: 'Pos' }, { has: 'RenderTag', include: false }] },
    map: ([id, pos]) => ({ id, pos: pos.data }),
});

// Define your systems

const UpdateSystem = createSystem({
    stage: 'update',
    fn: () => {
        for (const { pos, vel } of physicsQuery) {
            Vec2.add(pos, vel);
        }
    },
});

const RenderSystem = createSystem({
    stage: 'render',
    fn: () => {
        for (const { id, pos } of renderQuery) {
            console.log(`entity(${id}, [Pos(${pos[0]}, ${pos[1]})])`);
        }
    },
});

const StartupSystem = createSystem({
    stage: 'startup',
    fn: () => {
        world.spawnEntity('1', [
            createComponent('Pos', [0, 0]),
            createComponent('Vel', [1, 0]),
            createComponent('RenderTag'),
        ]);

        world.spawnEntity('2', [
            createComponent('Pos', [0, 0]),
            createComponent('Vel', [0, 1]),
            createComponent('RenderTag'),
        ]);
    },
});

// register systems and start the update loop

world.registerSystems([StartupSystem, UpdateSystem, RenderSystem]);
await world.run();
```