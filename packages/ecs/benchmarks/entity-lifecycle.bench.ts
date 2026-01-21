import { bench, describe } from 'vitest';
import { createWorld } from '../src/world';
import {
    BenchmarkComponent,
    createPosition,
    createVelocity,
    createHealth,
    createSprite,
    createCollider,
    createQueries,
    generateEntityBatch,
} from './fixtures';
import { SCALES, describeBenchmark } from './utils';

describe('Entity Lifecycle Benchmarks', () => {
    // createEntity benchmarks
    describe('createEntity', () => {
        SCALES.forEach((scale) => {
            bench(describeBenchmark('createEntity - cold start', scale), () => {
                const world = createWorld<BenchmarkComponent>();
                for (let i = 0; i < scale.count; i++) {
                    world.createEntity();
                }
            });

            bench(describeBenchmark('createEntity - with ID pool recycling', scale), () => {
                const world = createWorld<BenchmarkComponent>();

                // Pre-populate and despawn to create ID pool
                const entities = [];
                for (let i = 0; i < scale.count; i++) {
                    const entity = world.createEntity();
                    world.spawn(entity, [createPosition()]);
                    entities.push(entity);
                }

                // Despawn half to populate ID pool
                for (let i = 0; i < scale.count / 2; i++) {
                    world.despawn(entities[i]);
                }

                // Benchmark: create entities (will reuse IDs from pool)
                for (let i = 0; i < scale.count / 2; i++) {
                    world.createEntity();
                }
            });
        });
    });

    // spawn benchmarks
    describe('spawn', () => {
        SCALES.forEach((scale) => {
            bench(describeBenchmark('spawn', scale, 'single component'), () => {
                const world = createWorld<BenchmarkComponent>();
                const { components } = generateEntityBatch(scale.count, 1);

                for (let i = 0; i < scale.count; i++) {
                    const entity = world.createEntity();
                    world.spawn(entity, components[i]);
                }
            });

            bench(describeBenchmark('spawn', scale, '3 components'), () => {
                const world = createWorld<BenchmarkComponent>();
                const { components } = generateEntityBatch(scale.count, 3);

                for (let i = 0; i < scale.count; i++) {
                    const entity = world.createEntity();
                    world.spawn(entity, components[i]);
                }
            });

            bench(describeBenchmark('spawn', scale, '5 components'), () => {
                const world = createWorld<BenchmarkComponent>();
                const { components } = generateEntityBatch(scale.count, 5);

                for (let i = 0; i < scale.count; i++) {
                    const entity = world.createEntity();
                    world.spawn(entity, components[i]);
                }
            });
        });
    });

    // despawn benchmarks
    describe('despawn', () => {
        SCALES.forEach((scale) => {
            bench(describeBenchmark('despawn', scale, 'no active queries'), () => {
                const world = createWorld<BenchmarkComponent>();
                const entities = [];

                // Setup: spawn entities
                for (let i = 0; i < scale.count; i++) {
                    const entity = world.createEntity();
                    world.spawn(entity, [createPosition(), createVelocity(), createHealth()]);
                    entities.push(entity);
                }

                // Benchmark: despawn all entities
                for (let i = 0; i < scale.count; i++) {
                    world.despawn(entities[i]);
                }
            });

            bench(describeBenchmark('despawn', scale, 'with 5 active queries'), () => {
                const world = createWorld<BenchmarkComponent>();
                const entities = [];

                // Setup: spawn entities
                for (let i = 0; i < scale.count; i++) {
                    const entity = world.createEntity();
                    world.spawn(entity, [
                        createPosition(),
                        createVelocity(),
                        createHealth(),
                        createSprite(),
                        createCollider(),
                    ]);
                    entities.push(entity);
                }

                // Create 5 queries
                createQueries(world, 5);

                // Benchmark: despawn all entities
                for (let i = 0; i < scale.count; i++) {
                    world.despawn(entities[i]);
                }
            });

            bench(describeBenchmark('despawn', scale, 'with 10 active queries'), () => {
                const world = createWorld<BenchmarkComponent>();
                const entities = [];

                // Setup: spawn entities
                for (let i = 0; i < scale.count; i++) {
                    const entity = world.createEntity();
                    world.spawn(entity, [
                        createPosition(),
                        createVelocity(),
                        createHealth(),
                        createSprite(),
                        createCollider(),
                    ]);
                    entities.push(entity);
                }

                // Create 10 queries
                createQueries(world, 10);

                // Benchmark: despawn all entities
                for (let i = 0; i < scale.count; i++) {
                    world.despawn(entities[i]);
                }
            });
        });
    });

    // Combined: spawn + despawn cycle
    describe('spawn + despawn cycle', () => {
        SCALES.forEach((scale) => {
            bench(describeBenchmark('spawn + despawn cycle', scale), () => {
                const world = createWorld<BenchmarkComponent>();

                for (let i = 0; i < scale.count; i++) {
                    const entity = world.createEntity();
                    world.spawn(entity, [createPosition(), createVelocity(), createHealth()]);
                    world.despawn(entity);
                }
            });
        });
    });
});
