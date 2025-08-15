import { Component, createWorld } from '@timefold/ecs';
import { Mat4x4, Mat4x4Type, Vec2, Vec2Type } from '@timefold/math';
import { ENTITY_COUNT, SAMPLES } from './common';

type A = Component<'A', { pos: Vec2Type }>;
type B = Component<'B', { vel: Vec2Type }>;
type C = Component<'C', { scl: Vec2Type }>;
type D = Component<'D', { health: number }>;
type E = Component<'E', { mat: Mat4x4Type }>;

type WorldComponent = A | B | C | D | E;

const world = createWorld<WorldComponent>();

const query1 = world.createQuery({ query: { includeId: true, tuple: [{ has: 'A' }] } });
const query2 = world.createQuery({ query: { includeId: true, tuple: [{ has: 'A' }, { has: 'B' }] } });
const query3 = world.createQuery({ query: { includeId: true, tuple: [{ has: 'A' }, { has: 'B' }, { has: 'C' }] } });

const query12 = world.createQuery({ query: { includeId: true, tuple: [{ has: 'A' }] } });
const query22 = world.createQuery({ query: { includeId: true, tuple: [{ has: 'A' }, { has: 'B' }] } });
const query32 = world.createQuery({ query: { includeId: true, tuple: [{ has: 'A' }, { has: 'B' }, { has: 'C' }] } });

const query13 = world.createQuery({ query: { includeId: true, tuple: [{ has: 'A' }] } });
const query23 = world.createQuery({ query: { includeId: true, tuple: [{ has: 'A' }, { has: 'B' }] } });
const query33 = world.createQuery({ query: { includeId: true, tuple: [{ has: 'A' }, { has: 'B' }, { has: 'C' }] } });

// const query4 = world.createQuery({ query: { tuple: [{ has: 'A' }] } });
// const query5 = world.createQuery({ query: { tuple: [{ has: 'A' }, { has: 'B' }] } });
// const query6 = world.createQuery({ query: { tuple: [{ has: 'A' }, { has: 'B' }, { has: 'C' }] } });

// const query7 = world.createQuery({ query: { includeId: true, tuple: [{ has: 'A' }, { or: ['B', 'C'] }] } });
// const query8 = world.createQuery({ query: { includeId: true, tuple: [{ has: 'A' }, { or: ['D', 'E'] }] } });
// const query9 = world.createQuery({ query: { tuple: [{ has: 'A' }, { or: ['B', 'E'] }, { has: 'C' }] } });

const t1 = performance.now();

let iterations = 0;
let entityId = 0;

for (let j = 0; j < SAMPLES; j++) {
    for (let i = 0; i < ENTITY_COUNT; i++) {
        const a: A = { type: 'A', data: { pos: Vec2.create(0, 0) } };
        const b: B = { type: 'B', data: { vel: Vec2.create(0, 0) } };
        const c: C = { type: 'C', data: { scl: Vec2.create(0, 0) } };
        const d: D = { type: 'D', data: { health: 100 } };
        const e: E = { type: 'E', data: { mat: Mat4x4.create() } };

        world.spawnEntity((++entityId).toString(), [a]);
        world.spawnEntity((++entityId).toString(), [a, b]);
        world.spawnEntity((++entityId).toString(), [a, b, c]);
        world.spawnEntity((++entityId).toString(), [a, b, c, d]);
        world.spawnEntity((++entityId).toString(), [a, b, c, d, e]);
        iterations++;
    }
}

const t2 = performance.now();
const t = (t2 - t1) / SAMPLES;
console.log(`[OLD] ${SAMPLES} samples. Each sample spawns ${ENTITY_COUNT} entities. Avg time: ${t}`);
console.log({ iterations });

// ~ 21 ms

console.log({
    query1,
    query2,
    query3,
    // query4,
    // query5,
    // query6,
    // query7,
    // query8,
    // query9,
});
