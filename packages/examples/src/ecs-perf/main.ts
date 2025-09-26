import { createComponent, defineComponentTypes, worldBuilder } from '@timefold/ecs';
import { Vec2, Vec2Type, Vec3, Vec3Type } from '@timefold/math';
import { queryBuilder } from '../../../ecs/src/query';

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

const world = worldBuilder<WorldComponent>()
    .registerQueries({
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
    })
    .compile();

// world.on('ecs/spawn-entity', (payload) => {
//     console.log('spawn-entity', payload);
// });

// world.on('ecs/despawn-entity', (payload) => {
//     console.log('despawn-entity', payload);
// });

// world.on('ecs/add-component', (payload) => {
//     console.log('add-component', payload);
// });

// world.on('ecs/remove-component', (payload) => {
//     console.log('remove-comopnent', payload);
// });

const posOnly = world.getQuery('posOnly');
const velOnly = world.getQuery('velOnly');
const movable = world.getQuery('movable');

const ENTITY_COUNT = 10_000;
const SYSTEM_RUNS = 100;

// spawn test

const spawnT0 = performance.now();
for (let i = 0; i < ENTITY_COUNT; i++) {
    world.spawn(i, [createPosition(Vec2.create(0, 0)), createVelocity(Vec2.create(1, 1))]);
}
const spawnT1 = performance.now();
const spawnTime = `${(spawnT1 - spawnT0).toFixed(4)}ms`;
console.log(`Spawned ${ENTITY_COUNT} entities in ${spawnTime}`);

// addComponent test

const addCompT0 = performance.now();
for (let i = 0; i < ENTITY_COUNT; i++) {
    world.addComponent(i, createColor(Vec3.one()));
    world.addComponent(i, createRenderable());
}
const addCompT1 = performance.now();
const addCompTime = `${(addCompT1 - addCompT0).toFixed(4)}ms`;
console.log(`add 2 components to ${ENTITY_COUNT} entities in ${addCompTime}`);

// removeComponent test

const removeCompT0 = performance.now();
for (let i = 0; i < ENTITY_COUNT; i++) {
    world.removeComponent(i, T.COLOR);
    world.removeComponent(i, T.RENDERABLE);
}
const removeCompT1 = performance.now();
const removeCompTime = `${(removeCompT1 - removeCompT0).toFixed(4)}ms`;
console.log(`remove 2 components from ${ENTITY_COUNT} entities in ${removeCompTime}`);

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
const systemTime = `${((systemT1 - systemT0) / SYSTEM_RUNS).toFixed(4)}ms`;
console.log(`Ran 3 systems with avg time: ${systemTime}`);

// despawn test

const despawnT0 = performance.now();
for (let i = 0; i < ENTITY_COUNT; i++) {
    world.despawn(i);
}
const despawnT1 = performance.now();
const despawnTime = `${(despawnT1 - despawnT0).toFixed(4)}ms`;
console.log(`despawn ${ENTITY_COUNT} entities in ${despawnTime}`);

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

New system:
Spawned 10000 entities in 18.0500ms
add 2 components to 10000 entities in 13.7050ms
remove 2 components from 10000 entities in 2.7050ms
despawn 10000 entities in 14.3400ms

Spawned 10000 entities in 12.2050ms
add 2 components to 10000 entities in 15.5600ms
remove 2 components from 10000 entities in 2.8150ms
despawn 10000 entities in 6.4350ms

Spawned 10000 entities in 8.1600ms
add 2 components to 10000 entities in 17.2300ms
remove 2 components from 10000 entities in 2.8350ms
despawn 10000 entities in 5.8700ms

Spawned 10000 entities in 16.2800ms
add 2 components to 10000 entities in 7.4100ms
remove 2 components from 10000 entities in 3.2350ms
despawn 10000 entities in 8.0650ms

Spawned 10000 entities in 10.9000ms
add 2 components to 10000 entities in 15.9600ms
remove 2 components from 10000 entities in 2.2750ms
despawn 10000 entities in 5.7850ms

Spawned 10000 entities in 10.7550ms
add 2 components to 10000 entities in 21.6600ms
remove 2 components from 10000 entities in 2.4550ms
despawn 10000 entities in 5.7750ms

spawn = 18 + 12 + 8 + 16 + 11 + 10 = 75 / [12.5]
add = 13 + 15 + 17 + 7 + 15 + 21 = 88 / [14.6]
remove = 3 + 2 + 2 + 3 + 2 + 2 = 14 / [2.3]
despawn = 14 + 6 + 5 + 8 + 5 + 6 = 44 / [7.3]
 */
