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

// spawn test

const spawnT0 = performance.now();
for (let i = 0; i < ENTITY_COUNT; i++) {
    world.spawnEntity(i, [createPosition(Vec2.create(0, 0)), createVelocity(Vec2.create(1, 1))]);
    entities.push(i);
}
const spawnT1 = performance.now();
const spawnTime = `${(spawnT1 - spawnT0).toFixed(4)}ms`;
console.log(`Spawned ${ENTITY_COUNT} entities in ${spawnTime}`);

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

Spawned 10000 entities in 28.5500ms
add 2 components to 10000 entities in 10.3900ms
remove 2 components from 10000 entities in 21.3700ms
Ran 3 systems with avg time: 0.0009ms
despawn 10000 entities in 5.3900ms

Spawned 10000 entities in 27.8400ms
add 2 components to 10000 entities in 12.7400ms
remove 2 components from 10000 entities in 13.2300ms
Ran 3 systems with avg time: 0.0008ms
despawn 10000 entities in 5.0750ms

Spawned 10000 entities in 17.3150ms
add 2 components to 10000 entities in 15.3450ms
remove 2 components from 10000 entities in 12.4800ms
Ran 3 systems with avg time: 0.0007ms
despawn 10000 entities in 11.5500ms

Spawned 10000 entities in 10.0850ms
add 2 components to 10000 entities in 13.6800ms
remove 2 components from 10000 entities in 8.3550ms
Ran 3 systems with avg time: 0.0001ms
despawn 10000 entities in 5.1800ms

Spawned 10000 entities in 7.9600ms
add 2 components to 10000 entities in 5.2650ms
remove 2 components from 10000 entities in 21.4050ms
Ran 3 systems with avg time: 0.0001ms
despawn 10000 entities in 4.8900ms

Spawned 10000 entities in 7.8750ms
add 2 components to 10000 entities in 4.8650ms
remove 2 components from 10000 entities in 17.1000ms
Ran 3 systems with avg time: 0.0001ms
despawn 10000 entities in 4.8350ms
 */
