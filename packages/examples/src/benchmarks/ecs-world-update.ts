// === ECS World Update Benchmark ===
//
// Measures how fast world.update processes 10 systems with various computations
// (physics, gravity, collision, damping, bounds, aging, health, scoring, flocking, cleanup).
//
// Run this benchmark before and after ECS refactoring to compare performance.
// Record the results manually each time.

/* eslint-disable prettier/prettier */

import { createComponent, defineComponents, InferComponents, query, system, worldBuilder } from '@timefold/ecs';
import * as S from '@timefold/ecs/schema';
import { Vec3 } from '@timefold/math';

// --- Configuration ---

const ENTITY_COUNT = 10_000;
const FRAMES_PER_SAMPLE = 1_000;
const SAMPLES = 50;
const WARMUP_FRAMES = 5_000;
const TRIM_COUNT = 5;

// --- Components ---

const components = defineComponents({
    Position: S.vec3,
    Velocity: S.vec3,
    Acceleration: S.vec3,
    Mass: S.number,
    Radius: S.number,
    Health: S.number,
    Age: S.number,
    Score: S.number,
    Damping: S.number,
    FlockId: S.number,
    Alive: undefined,
    Grounded: undefined,
});

type C = InferComponents<typeof components>;

// --- Queries (10 total) ---

// 1. Gravity: apply gravitational acceleration
const gravityQuery = query<C>()
    .name('gravity')
    .with('Acceleration')
    .with('Mass')
    .with('Alive', { include: false })
    .map(([acc, mass]) => ({ acc: acc.data, mass: mass.data }))
    .compile();

// 2. Physics integration: velocity += acceleration, position += velocity
const physicsQuery = query<C>()
    .name('physics')
    .with('Position')
    .with('Velocity')
    .with('Acceleration')
    .with('Alive', { include: false })
    .map(([pos, vel, acc]) => ({ pos: pos.data, vel: vel.data, acc: acc.data }))
    .compile();

// 3. Damping: reduce velocity over time
const dampingQuery = query<C>()
    .name('damping')
    .with('Velocity')
    .with('Damping')
    .with('Alive', { include: false })
    .map(([vel, damp]) => ({ vel: vel.data, damping: damp.data }))
    .compile();

// 4. Bounds checking: clamp position within world bounds
const boundsQuery = query<C>()
    .name('bounds')
    .with('Position')
    .with('Velocity')
    .with('Alive', { include: false })
    .map(([pos, vel]) => ({ pos: pos.data, vel: vel.data }))
    .compile();

// 5. Collision detection (simplified): check pairs within radius
const collisionQuery = query<C>()
    .name('collision')
    .with('Position')
    .with('Velocity')
    .with('Radius')
    .with('Mass')
    .with('Alive', { include: false })
    .map(([pos, vel, rad, mass]) => ({ pos: pos.data, vel: vel.data, radius: rad.data, mass: mass.data }))
    .compile();

// 6. Aging: increment age each frame
const agingQuery = query<C>()
    .name('aging')
    .with('Age')
    .with('Health')
    .with('Alive', { include: false })
    .map(([age, health]) => ({ age: age.data, health: health.data }))
    .compile();

// 7. Health decay: reduce health based on age
const healthQuery = query<C>()
    .name('health')
    .with('Health')
    .with('Age')
    .with('Alive', { include: false })
    .map(([health, age]) => ({ health: health.data, age: age.data }))
    .compile();

// 8. Scoring: accumulate score based on position height
const scoringQuery = query<C>()
    .name('scoring')
    .with('Score')
    .with('Position')
    .with('Alive', { include: false })
    .map(([score, pos]) => ({ score: score.data, pos: pos.data }))
    .compile();

// 9. Flocking: simple boid-like separation force
const flockingQuery = query<C>()
    .name('flocking')
    .with('Position')
    .with('Velocity')
    .with('FlockId')
    .with('Alive', { include: false })
    .map(([pos, vel, flock]) => ({ pos: pos.data, vel: vel.data, flockId: flock.data }))
    .compile();

// 10. Ground check: determine if entity is on the ground
const groundQuery = query<C>()
    .name('ground')
    .with('Position')
    .with('Velocity')
    .with('Grounded', { include: false })
    .with('Alive', { include: false })
    .map(([pos, vel]) => ({ pos: pos.data, vel: vel.data }))
    .compile();

// --- Build World ---

const world = worldBuilder()
    .withComponents(components)
    .withQueries(
        gravityQuery, physicsQuery, dampingQuery, boundsQuery, collisionQuery,
        agingQuery, healthQuery, scoringQuery, flockingQuery, groundQuery,
    )
    .compile();

// --- Spawn Entities ---

const spawnSystem = system(() => {
    for (let i = 0; i < ENTITY_COUNT; i++) {
        const angle = i * 0.01;
        world.spawn([
            createComponent('Position', Vec3.create(
                Math.sin(angle) * 50.0,
                Math.random() * 100.0,
                Math.cos(angle) * 50.0,
            )),
            createComponent('Velocity', Vec3.create(
                (Math.random() - 0.5) * 2.0,
                (Math.random() - 0.5) * 2.0,
                (Math.random() - 0.5) * 2.0,
            )),
            createComponent('Acceleration', Vec3.create(0.0, 0.0, 0.0)),
            createComponent('Mass', 1.0 + Math.random() * 10.0),
            createComponent('Radius', 0.5 + Math.random() * 2.0),
            createComponent('Health', 100.0),
            createComponent('Age', 0.0),
            createComponent('Score', 0.0),
            createComponent('Damping', 0.95 + Math.random() * 0.04),
            createComponent('FlockId', Math.floor(Math.random() * 5.0)),
            createComponent('Alive'),
            createComponent('Grounded'),
        ]);
    }
});

// --- Get Query Results ---

const gravityResults = world.getQueryResults('gravity');
const physicsResults = world.getQueryResults('physics');
const dampingResults = world.getQueryResults('damping');
const boundsResults = world.getQueryResults('bounds');
const collisionResults = world.getQueryResults('collision');
const agingResults = world.getQueryResults('aging');
const healthResults = world.getQueryResults('health');
const scoringResults = world.getQueryResults('scoring');
const flockingResults = world.getQueryResults('flocking');
const groundResults = world.getQueryResults('ground');

// --- Systems ---

const GRAVITY = Vec3.create(0.0, -9.81, 0.0);
const DT = 1.0 / 60.0;
const WORLD_HALF_SIZE = 200.0;
const GROUND_Y = 0.0;

const tempVec = Vec3.create();

// 1. Gravity system
const gravitySystem = system(() => {
    for (let i = 0; i < gravityResults.length; i++) {
        const { acc, mass } = gravityResults[i];
        const invMass = 1.0 / mass;
        acc[0] = GRAVITY[0] * invMass;
        acc[1] = GRAVITY[1] * invMass;
        acc[2] = GRAVITY[2] * invMass;
    }
});

// 2. Physics integration
const physicsSystem = system(() => {
    for (let i = 0; i < physicsResults.length; i++) {
        const { pos, vel, acc } = physicsResults[i];
        vel[0] += acc[0] * DT;
        vel[1] += acc[1] * DT;
        vel[2] += acc[2] * DT;
        pos[0] += vel[0] * DT;
        pos[1] += vel[1] * DT;
        pos[2] += vel[2] * DT;
    }
});

// 3. Damping
const dampingSystem = system(() => {
    for (let i = 0; i < dampingResults.length; i++) {
        const { vel, damping } = dampingResults[i];
        vel[0] *= damping;
        vel[1] *= damping;
        vel[2] *= damping;
    }
});

// 4. Bounds checking
const boundsSystem = system(() => {
    for (let i = 0; i < boundsResults.length; i++) {
        const { pos, vel } = boundsResults[i];
        for (let axis = 0; axis < 3; axis++) {
            if (pos[axis] > WORLD_HALF_SIZE) {
                pos[axis] = WORLD_HALF_SIZE;
                vel[axis] = -Math.abs(vel[axis]) * 0.8;
            } else if (pos[axis] < -WORLD_HALF_SIZE) {
                pos[axis] = -WORLD_HALF_SIZE;
                vel[axis] = Math.abs(vel[axis]) * 0.8;
            }
        }
    }
});

// 5. Collision (simplified: check neighbors in a strided pattern to keep O(n))
const collisionSystem = system(() => {
    const len = collisionResults.length;
    const stride = Math.max(1, Math.floor(len / 64));
    for (let i = 0; i < len; i++) {
        const a = collisionResults[i];
        const j = (i + stride) % len;
        const b = collisionResults[j];
        const dx = b.pos[0] - a.pos[0];
        const dy = b.pos[1] - a.pos[1];
        const dz = b.pos[2] - a.pos[2];
        const distSq = dx * dx + dy * dy + dz * dz;
        const minDist = a.radius + b.radius;
        if (distSq < minDist * minDist && distSq > 0.0001) {
            const dist = Math.sqrt(distSq);
            const nx = dx / dist;
            const ny = dy / dist;
            const nz = dz / dist;
            const totalMass = a.mass + b.mass;
            const impulse = 0.5 / totalMass;
            a.vel[0] -= nx * impulse;
            a.vel[1] -= ny * impulse;
            a.vel[2] -= nz * impulse;
            b.vel[0] += nx * impulse;
            b.vel[1] += ny * impulse;
            b.vel[2] += nz * impulse;
        }
    }
});

// 6. Aging
const agingSystem = system(() => {
    for (let i = 0; i < agingResults.length; i++) {
        // Age is a number component — we can't mutate it in place, so we do math and use sink
        agingResults[i].age += 1;
    }
});

// 7. Health decay
const healthSystem = system(() => {
    for (let i = 0; i < healthResults.length; i++) {
        // Similarly, number components are immutable values
        // Simulate reading and computing
        const { health, age } = healthResults[i];
        tempVec[0] = health - age * 0.001;
    }
});

// 8. Scoring
const scoringSystem = system(() => {
    for (let i = 0; i < scoringResults.length; i++) {
        const { score, pos } = scoringResults[i];
        // Compute score contribution based on height
        tempVec[0] = score + Math.max(0.0, pos[1]) * 0.01;
    }
});

// 9. Flocking (simplified separation)
const flockingSystem = system(() => {
    const len = flockingResults.length;
    const stride = Math.max(1, Math.floor(len / 32));
    for (let i = 0; i < len; i++) {
        const a = flockingResults[i];
        // Check a few neighbors for separation
        for (let k = 1; k <= 3; k++) {
            const j = (i + k * stride) % len;
            const b = flockingResults[j];
            if (a.flockId !== b.flockId) continue;
            const dx = a.pos[0] - b.pos[0];
            const dy = a.pos[1] - b.pos[1];
            const dz = a.pos[2] - b.pos[2];
            const distSq = dx * dx + dy * dy + dz * dz;
            if (distSq < 25.0 && distSq > 0.0001) {
                const invDist = 1.0 / Math.sqrt(distSq);
                a.vel[0] += dx * invDist * 0.1;
                a.vel[1] += dy * invDist * 0.1;
                a.vel[2] += dz * invDist * 0.1;
            }
        }
    }
});

// 10. Ground check
const groundSystem = system(() => {
    for (let i = 0; i < groundResults.length; i++) {
        const { pos, vel } = groundResults[i];
        if (pos[1] < GROUND_Y) {
            pos[1] = GROUND_Y;
            if (vel[1] < 0.0) {
                vel[1] = -vel[1] * 0.5;
            }
        }
    }
});

const updateSystems = [
    gravitySystem,
    physicsSystem,
    dampingSystem,
    boundsSystem,
    collisionSystem,
    agingSystem,
    healthSystem,
    scoringSystem,
    flockingSystem,
    groundSystem,
];

// --- Statistics ---

const trimmedMean = (times: number[]): number => {
    const sorted = [...times].sort((a, b) => a - b);
    const trimmed = sorted.slice(TRIM_COUNT, sorted.length - TRIM_COUNT);
    let sum = 0;
    for (let i = 0; i < trimmed.length; i++) sum += trimmed[i];
    return sum / trimmed.length;
};

const median = (times: number[]): number => {
    const sorted = [...times].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
    return sorted[mid];
};

const stdDev = (times: number[], mean: number): number => {
    let sum = 0;
    for (let i = 0; i < times.length; i++) {
        const diff = times[i] - mean;
        sum += diff * diff;
    }
    return Math.sqrt(sum / times.length);
};

// --- Main ---

const runBenchmark = async () => {
    console.log('=== ECS World Update Benchmark ===');
    console.log(`Entities: ${ENTITY_COUNT.toLocaleString()}`);
    console.log(`Systems: 10 (gravity, physics, damping, bounds, collision, aging, health, scoring, flocking, ground)`);
    console.log(`Frames per sample: ${FRAMES_PER_SAMPLE.toLocaleString()}`);
    console.log(`Samples: ${SAMPLES} (trimming ${TRIM_COUNT} from each end)`);
    console.log(`Warmup frames: ${WARMUP_FRAMES.toLocaleString()}`);
    console.log('');

    // Spawn entities
    world.startup([spawnSystem]);
    world.updateQueries();

    console.log(`Spawned ${ENTITY_COUNT.toLocaleString()} entities`);
    console.log(`Query result counts: gravity=${gravityResults.length}, physics=${physicsResults.length}, collision=${collisionResults.length}, flocking=${flockingResults.length}`);
    console.log('');

    // Warmup
    console.log('Warming up...');
    for (let f = 0; f < WARMUP_FRAMES; f++) {
        world.update(updateSystems);
    }
    await new Promise((r) => setTimeout(r, 500));

    // Measurement
    console.log('Running samples...');
    const times: number[] = [];

    for (let s = 0; s < SAMPLES; s++) {
        const start = performance.now();
        for (let f = 0; f < FRAMES_PER_SAMPLE; f++) {
            world.update(updateSystems);
        }
        times.push(performance.now() - start);

        if (s % 10 === 9) {
            await new Promise((r) => setTimeout(r, 50));
        }
    }

    // Results
    const mean = trimmedMean(times);
    const med = median(times);
    const std = stdDev(times, mean);
    const perFrame = mean / FRAMES_PER_SAMPLE;

    console.log('');
    console.log(`Results (ms per ${FRAMES_PER_SAMPLE.toLocaleString()} frames):`);
    console.log(`  mean=${mean.toFixed(2)}  median=${med.toFixed(2)}  stddev=${std.toFixed(2)}`);
    console.log(`  per-frame average: ${perFrame.toFixed(4)}ms`);
    console.log(`  per-frame FPS equivalent: ${(1000.0 / perFrame).toFixed(0)} (if this was the only work)`);
    console.log('');
    console.log('Record these numbers and run again after refactoring to compare.');
};

/* eslint-enable prettier/prettier */

void runBenchmark();
