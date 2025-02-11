import { Component, createComponent, createSystem, createWorld } from '@timefold/ecs';
import { Vec2 } from '@timefold/math';

// define your component types

type Position = Component<'Pos', [number, number]>;
type Velocity = Component<'Vel', [number, number]>;
type RenderTag = Component<'RenderTag'>;
type WorldComponent = Position | Velocity | RenderTag;

// create a world

const world = createWorld<WorldComponent>();

// define your queries (TS autocompletion in definitions and strongly typed results)

const physicsQuery = world.createQuery({
    query: { tuple: [{ has: 'Pos' }, { has: 'Vel' }] },
    map: ([pos, vel]) => ({ pos: pos.data, vel: vel.data }),
});

const renderQuery = world.createQuery({
    query: { includeId: true, tuple: [{ has: 'Pos' }, { has: 'RenderTag', include: false }] },
    map: ([id, pos]) => ({ id, pos: pos.data }),
});

// define your systems

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
            createComponent('Vel', [0, 0]),
            createComponent('RenderTag'),
        ]);

        world.spawnEntity('2', [
            createComponent('Pos', [0, 0]),
            createComponent('Vel', [0, 0]),
            createComponent('RenderTag'),
        ]);
    },
});

// register systems and start the update loop

world.registerSystems([StartupSystem, UpdateSystem, RenderSystem]);
await world.run();
