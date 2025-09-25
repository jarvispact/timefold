import { createComponent, createWorld } from '@timefold/ecs';
import { Vec2, Vec2Type, Vec3, Vec3Type } from '@timefold/math';

const createPosition = (vec2: Vec2Type) => createComponent('POSITION', vec2);
const createVelocity = (vec2: Vec2Type) => createComponent('VELOCITY', vec2);
const createColor = (color: Vec3Type) => createComponent('COLOR', color);
const createRenderable = () => createComponent('RENDERABLE');

type WorldComponent =
    | ReturnType<typeof createPosition>
    | ReturnType<typeof createVelocity>
    | ReturnType<typeof createColor>
    | ReturnType<typeof createRenderable>;

const world = createWorld<WorldComponent>();

const posOnly = world.createQuery({
    query: { includeId: true, tuple: [{ has: 'POSITION' }] },
    map: ([id, pos]) => ({ id, pos: pos.data }),
});

const velOnly = world.createQuery({
    query: { includeId: true, tuple: [{ has: 'VELOCITY' }] },
    map: ([id, vel]) => ({ id, vel: vel.data }),
});

const movable = world.createQuery({
    query: { includeId: true, tuple: [{ has: 'POSITION' }, { has: 'VELOCITY' }] },
    map: ([id, pos, vel]) => ({ id, pos: pos.data, vel: vel.data }),
});

const ENTITY_COUNT = 10_000;
const SYSTEM_RUNS = 100;
const entities: number[] = [];

console.log(posOnly.length);
console.log(velOnly.length);
console.log(movable.length);

// spawn test

const spawnT0 = performance.now();
for (let i = 0; i < ENTITY_COUNT; i++) {
    world.spawnEntity(i, [createPosition(Vec2.create(0, 0)), createVelocity(Vec2.create(1, 1))]);
    entities.push(i);
}
const spawnT1 = performance.now();
const spawnTime = `${(spawnT1 - spawnT0).toFixed(4)}ms`;
console.log(`Spawned ${ENTITY_COUNT} entities in ${spawnTime}`);

console.log(posOnly.length);
console.log(velOnly.length);
console.log(movable.length);

// addComponent test

const addCompT0 = performance.now();
for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    world.addComponent(entity, createColor(Vec3.one()));
    world.addComponent(entity, createRenderable());
}
const addCompT1 = performance.now();
const addCompTime = `${(addCompT1 - addCompT0).toFixed(4)}ms`;
console.log(`add 2 components to ${entities.length} entities in ${addCompTime}`);

console.log(posOnly.length);
console.log(velOnly.length);
console.log(movable.length);

// removeComponent test

// TODO: There is a issue with removing components
// The queries are empty afterwards

const removeCompT0 = performance.now();
for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    world.removeComponent(entity, 'COLOR');
    world.removeComponent(entity, 'RENDERABLE');
}
const removeCompT1 = performance.now();
const removeCompTime = `${(removeCompT1 - removeCompT0).toFixed(4)}ms`;
console.log(`remove 2 components from ${entities.length} entities in ${removeCompTime}`);

// system test

console.log(posOnly.length);
console.log(velOnly.length);
console.log(movable.length);

const system1 = () => {
    for (let i = 0; i < posOnly.length; i++) {
        const item = posOnly[i];
        Vec2.add(item.pos, item.pos);
    }
};

const system2 = () => {
    for (let i = 0; i < velOnly.length; i++) {
        const item = velOnly[i];
        Vec2.add(item.vel, item.vel);
    }
};

const system3 = () => {
    for (let i = 0; i < movable.length; i++) {
        const item = movable[i];
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
for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    world.despawnEntity(entity);
}
const despawnT1 = performance.now();
const despawnTime = `${(despawnT1 - despawnT0).toFixed(4)}ms`;
console.log(`despawn ${entities.length} entities in ${despawnTime}`);

/**
Results old:

Spawned 10000 entities in 25.9350ms
add 2 components to 10000 entities in 16.8900ms
remove 2 components from 10000 entities in 17.3500ms
Ran 3 systems with avg time: 0.0007ms
despawn 10000 entities in 5.6700ms

Spawned 10000 entities in 19.7250ms
add 2 components to 10000 entities in 19.0750ms
remove 2 components from 10000 entities in 19.9750ms
Ran 3 systems with avg time: 0.0012ms
despawn 10000 entities in 9.7250ms

Spawned 10000 entities in 14.9950ms
add 2 components to 10000 entities in 5.4700ms
remove 2 components from 10000 entities in 10.8700ms
Ran 3 systems with avg time: 0.0006ms
despawn 10000 entities in 9.6550ms

Spawned 10000 entities in 28.2550ms
add 2 components to 10000 entities in 11.0600ms
remove 2 components from 10000 entities in 13.7350ms
Ran 3 systems with avg time: 0.0008ms
despawn 10000 entities in 5.5250ms

Spawned 10000 entities in 26.3950ms
add 2 components to 10000 entities in 7.0200ms
remove 2 components from 10000 entities in 25.8700ms
Ran 3 systems with avg time: 0.0014ms
despawn 10000 entities in 9.4200ms

Spawned 10000 entities in 27.0000ms
add 2 components to 10000 entities in 12.8650ms
remove 2 components from 10000 entities in 21.5100ms
Ran 3 systems with avg time: 0.0016ms
despawn 10000 entities in 8.3350ms

Results new:

Spawned 10000 entities in 29.6500ms
add 2 components to 10000 entities in 48.6550ms
remove 2 components from 10000 entities in 1.8200ms
Ran 3 systems with avg time: 0.2835ms
despawn 10000 entities in 3.1700ms

Spawned 10000 entities in 56.2000ms
add 2 components to 10000 entities in 41.7700ms
remove 2 components from 10000 entities in 1.9200ms
Ran 3 systems with avg time: 0.1950ms
despawn 10000 entities in 3.2100ms

Spawned 10000 entities in 34.0250ms
add 2 components to 10000 entities in 48.9400ms
remove 2 components from 10000 entities in 1.9650ms
Ran 3 systems with avg time: 0.2623ms
despawn 10000 entities in 3.2200ms

Spawned 10000 entities in 36.2200ms
add 2 components to 10000 entities in 42.2100ms
remove 2 components from 10000 entities in 2.1450ms
Ran 3 systems with avg time: 0.2542ms
despawn 10000 entities in 7.9750ms

Spawned 10000 entities in 61.1550ms
add 2 components to 10000 entities in 52.2950ms
remove 2 components from 10000 entities in 1.7000ms
Ran 3 systems with avg time: 0.1881ms
despawn 10000 entities in 3.2150ms

Spawned 10000 entities in 44.7850ms
add 2 components to 10000 entities in 44.7250ms
remove 2 components from 10000 entities in 1.6200ms
Ran 3 systems with avg time: 0.3096ms
despawn 10000 entities in 2.9950ms
 */
