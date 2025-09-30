import { createComponent, defineComponentTypes, worldBuilder, queryBuilder, defineQueries } from '@timefold/ecs';
import { Vec2, Vec2Type, Vec3, Vec3Type } from '@timefold/math';

const T = defineComponentTypes(['POSITION', 'VELOCITY', 'COLOR', 'RENDERABLE']);

const createPosition = (vec2: Vec2Type) => createComponent(T.POSITION, vec2);
const createVelocity = (vec2: Vec2Type) => createComponent(T.VELOCITY, vec2);
const createColor = (color: Vec3Type) => createComponent(T.COLOR, color);
const createRenderable = () => createComponent(T.RENDERABLE);

type WorldComponent =
    | ReturnType<typeof createPosition>
    | ReturnType<typeof createVelocity>
    | ReturnType<typeof createColor>
    | ReturnType<typeof createRenderable>;

const queries = defineQueries({
    posOnly: queryBuilder<WorldComponent>()
        .includeEntity()
        .with(T.POSITION)
        .map(([id, pos]) => ({ id, pos: pos.data }))
        .compile(),
    velOnly: queryBuilder<WorldComponent>()
        .includeEntity()
        .with(T.VELOCITY)
        .map(([id, vel]) => ({ id, vel: vel.data }))
        .compile(),
    movable: queryBuilder<WorldComponent>()
        .includeEntity()
        .with(T.POSITION)
        .with(T.VELOCITY)
        .map(([id, pos, vel]) => ({ id, pos: pos.data, vel: vel.data }))
        .compile(),
});

const world = worldBuilder<WorldComponent>()
    .defineResources({
        a: { foo: 'bar' },
    })
    .defineQueries(queries)
    .compile();

const posOnly = world.getQuery('posOnly');
const velOnly = world.getQuery('velOnly');
const movable = world.getQuery('movable');

const ENTITY_COUNT = 10_000;
const SYSTEM_RUNS = 100;

const NUM_RUNS = 100;

const avgTimes = {
    spawn: 0,
    add: 0,
    remove: 0,
    system: 0,
    despawn: 0,
};

for (let i = 0; i < NUM_RUNS; i++) {
    // spawn test

    const spawnT0 = performance.now();
    for (let i = 0; i < ENTITY_COUNT; i++) {
        world.spawn(i, [createPosition(Vec2.create(0, 0)), createVelocity(Vec2.create(1, 1))]);
    }
    const spawnT1 = performance.now();
    avgTimes.spawn += spawnT1 - spawnT0;

    // addComponent test

    const addCompT0 = performance.now();
    for (let i = 0; i < ENTITY_COUNT; i++) {
        world.addComponent(i, createColor(Vec3.one()));
        world.addComponent(i, createRenderable());
    }
    const addCompT1 = performance.now();
    avgTimes.add += addCompT1 - addCompT0;

    // removeComponent test

    const removeCompT0 = performance.now();
    for (let i = 0; i < ENTITY_COUNT; i++) {
        world.removeComponent(i, T.COLOR);
        world.removeComponent(i, T.RENDERABLE);
    }
    const removeCompT1 = performance.now();
    avgTimes.remove += removeCompT1 - removeCompT0;

    // system test

    const system1 = () => {
        for (let i = 0; i < posOnly.result.length; i++) {
            const item = posOnly.result[i];
            Vec2.add(item.pos, item.pos);
        }
    };

    const system2 = () => {
        for (let i = 0; i < velOnly.result.length; i++) {
            const item = velOnly.result[i];
            Vec2.add(item.vel, item.vel);
        }
    };

    const system3 = () => {
        for (let i = 0; i < movable.result.length; i++) {
            const item = movable.result[i];
            Vec2.add(item.pos, item.vel);
        }
    };

    const systemT0 = performance.now();
    for (let i = 0; i < SYSTEM_RUNS; i++) {
        system1();
        system2();
        system3();
    }
    const systemT1 = performance.now();
    avgTimes.system += (systemT1 - systemT0) / SYSTEM_RUNS;

    // despawn test

    const despawnT0 = performance.now();
    for (let i = 0; i < ENTITY_COUNT; i++) {
        world.despawn(i);
    }
    const despawnT1 = performance.now();
    avgTimes.despawn += despawnT1 - despawnT0;
}

const avg = {
    spawn: avgTimes.spawn / NUM_RUNS,
    add: avgTimes.add / NUM_RUNS,
    remove: avgTimes.remove / NUM_RUNS,
    system: avgTimes.system / NUM_RUNS,
    despawn: avgTimes.despawn / NUM_RUNS,
};

console.log(avg);

/**
Old system:
Spawned 10000 entities in 28.5500ms
add 2 components to 10000 entities in 10.3900ms
remove 2 components from 10000 entities in 21.3700ms
despawn 10000 entities in 5.3900ms

Spawned 10000 entities in 27.8400ms
add 2 components to 10000 entities in 12.7400ms
remove 2 components from 10000 entities in 13.2300ms
despawn 10000 entities in 5.0750ms

Spawned 10000 entities in 17.3150ms
add 2 components to 10000 entities in 15.3450ms
remove 2 components from 10000 entities in 12.4800ms
despawn 10000 entities in 11.5500ms

Spawned 10000 entities in 10.0850ms
add 2 components to 10000 entities in 13.6800ms
remove 2 components from 10000 entities in 8.3550ms
despawn 10000 entities in 5.1800ms

Spawned 10000 entities in 7.9600ms
add 2 components to 10000 entities in 5.2650ms
remove 2 components from 10000 entities in 21.4050ms
despawn 10000 entities in 4.8900ms

Spawned 10000 entities in 7.8750ms
add 2 components to 10000 entities in 4.8650ms
remove 2 components from 10000 entities in 17.1000ms
despawn 10000 entities in 4.8350ms

spawn = 28 + 27 + 17 + 10 + 8 + 8 = 98 = avg [16]
add = 10 + 12 + 15 + 13 + 5 + 4 = 59 = avg [10]
remove = 21 + 13 + 12 + 8 + 21 + 17 = 92 = avg [15]
despawn = 5 + 5 + 11 + 5 + 4 + 4 = 34 = avg [5]

// =============================
new system
Support for 128 component types:

{
    "spawn": 8.492,
    "add": 3.247,
    "remove": 1.798,
    "despawn": 2.563
}

difference:

spawn: 1.8x faster
add: 3x faster
remove: 8.3x faster
despawn: 1.9x faster

 */
