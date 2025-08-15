import { Component2, queryBuilder, worldBuilder2 } from '@timefold/ecs';
import { Mat4x4, Mat4x4Type, Vec2, Vec2Type } from '@timefold/math';
import { ENTITY_COUNT, SAMPLES } from './common';

const T_A = 0;
const T_B = 1;
const T_C = 2;
const T_D = 3;
const T_E = 4;

type A = Component2<typeof T_A, { pos: Vec2Type }>;
type B = Component2<typeof T_B, { vel: Vec2Type }>;
type C = Component2<typeof T_C, { scl: Vec2Type }>;
type D = Component2<typeof T_D, { health: number }>;
type E = Component2<typeof T_E, { mat: Mat4x4Type }>;

type WorldComponent = A | B | C | D | E;

const world = worldBuilder2<WorldComponent>()
    .defineQueries({
        query1: queryBuilder<WorldComponent>().includeEntity().with(T_A).compile(),
        query2: queryBuilder<WorldComponent>().includeEntity().with(T_A).with(T_B).compile(),
        query3: queryBuilder<WorldComponent>().includeEntity().with(T_A).with(T_B).with(T_C).compile(),

        query12: queryBuilder<WorldComponent>().includeEntity().with(T_A).compile(),
        query22: queryBuilder<WorldComponent>().includeEntity().with(T_A).with(T_B).compile(),
        query32: queryBuilder<WorldComponent>().includeEntity().with(T_A).with(T_B).with(T_C).compile(),

        query13: queryBuilder<WorldComponent>().includeEntity().with(T_A).compile(),
        query23: queryBuilder<WorldComponent>().includeEntity().with(T_A).with(T_B).compile(),
        query33: queryBuilder<WorldComponent>().includeEntity().with(T_A).with(T_B).with(T_C).compile(),

        // query4: queryBuilder<WorldComponent>().with(T_A).compile(),
        // query5: queryBuilder<WorldComponent>().with(T_A).with(T_B).compile(),
        // query6: queryBuilder<WorldComponent>().with(T_A).with(T_B).with(T_C).compile(),

        // query7: queryBuilder<WorldComponent>().with(T_A).withAny([T_B, T_C]).compile(),
        // query8: queryBuilder<WorldComponent>().with(T_A).withAny([T_D, T_E]).compile(),
        // query9: queryBuilder<WorldComponent>().with(T_A).withAny([T_B, T_E]).with(T_C).compile(),
    })
    .compile();

const t1 = performance.now();

let iterations = 0;
let entityId = 0;

for (let j = 0; j < SAMPLES; j++) {
    for (let i = 0; i < ENTITY_COUNT; i++) {
        const a: A = { type: T_A, data: { pos: Vec2.create(0, 0) } };
        const b: B = { type: T_B, data: { vel: Vec2.create(0, 0) } };
        const c: C = { type: T_C, data: { scl: Vec2.create(0, 0) } };
        const d: D = { type: T_D, data: { health: 100 } };
        const e: E = { type: T_E, data: { mat: Mat4x4.create() } };

        world.spawnEntity(++entityId, [a]);
        world.spawnEntity(++entityId, [a, b]);
        world.spawnEntity(++entityId, [a, b, c]);
        world.spawnEntity(++entityId, [a, b, c, d]);
        world.spawnEntity(++entityId, [a, b, c, d, e]);
        iterations++;
    }
}

const t2 = performance.now();
const t = (t2 - t1) / SAMPLES;
console.log(`[NEW] ${SAMPLES} samples. Each sample spawns ${ENTITY_COUNT} entities. Avg time: ${t}`);
console.log({ iterations });

// const a: A = { type: T_A, data: { pos: Vec2.create(0, 0) } };
// const b: B = { type: T_B, data: { vel: Vec2.create(0, 0) } };
// const c: C = { type: T_C, data: { scl: Vec2.create(0, 0) } };
// const d: D = { type: T_D, data: { health: 100 } };
// const e: E = { type: T_E, data: { mat: Mat4x4.create() } };
// world.spawnEntity(0, [a]);
// world.spawnEntity(1, [a, b]);

console.log({
    query1: world.getQuery('query1'),
    query2: world.getQuery('query2'),
    query3: world.getQuery('query3'),
    // query4: world.getQuery('query4'),
    // query5: world.getQuery('query5'),
    // query6: world.getQuery('query6'),
    // query7: world.getQuery('query7'),
    // query8: world.getQuery('query8'),
    // query9: world.getQuery('query9'),
});
