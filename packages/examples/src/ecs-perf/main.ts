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
