import { bench, describe } from 'vitest';
import { BenchmarkComponent, T, createPopulatedWorld, createMixedComponentDistribution } from './fixtures';
import { SCALES, describeBenchmark } from './utils';
import { createWorld } from '../src/world';

describe('Query Operations Benchmarks', () => {
    // createQuery benchmarks
    describe('createQuery', () => {
        SCALES.forEach((scale) => {
            bench(describeBenchmark('createQuery', scale, '2 component types'), () => {
                const { world } = createPopulatedWorld({
                    entityCount: scale.count,
                    entityConfig: {
                        specificComponents: [T.Position, T.Velocity, T.Health],
                    },
                });

                // Benchmark: create simple query
                world.createQuery({
                    query: { tuple: [T.Position, T.Velocity] },
                });
            });

            bench(describeBenchmark('createQuery', scale, '5 component types'), () => {
                const { world } = createPopulatedWorld({
                    entityCount: scale.count,
                    entityConfig: {
                        componentCount: 5,
                    },
                });

                // Benchmark: create complex query
                world.createQuery({
                    query: {
                        tuple: [T.Position, T.Velocity, T.Health, T.Sprite, T.Collider],
                    },
                });
            });
        });
    });

    // Query iteration benchmarks with different match rates
    describe('query iteration', () => {
        SCALES.forEach((scale) => {
            bench(describeBenchmark('query iteration', scale, '10% match rate'), () => {
                const world = createWorld<BenchmarkComponent>();

                // Setup: 10% of entities have Position + Velocity
                const matchCount = Math.floor(scale.count * 0.1);
                createMixedComponentDistribution(world, matchCount);

                // Fill rest with entities that don't match
                for (let i = matchCount; i < scale.count; i++) {
                    const entity = world.createEntity();
                    world.spawn(entity, []);
                }

                // Create query
                const query = world.createQuery({
                    query: { tuple: [T.Position, T.Velocity] },
                });

                // Benchmark: iterate over query results
                let count = 0;
                for (let i = 0; i < query.length; i++) {
                    count++;
                }
            });

            bench(describeBenchmark('query iteration', scale, '50% match rate'), () => {
                const world = createWorld<BenchmarkComponent>();

                // Setup: 50% have Position + Velocity, 50% have only Position
                const matchCount = Math.floor(scale.count * 0.5);
                createMixedComponentDistribution(world, matchCount);

                // Fill rest with entities that don't match
                for (let i = matchCount; i < scale.count; i++) {
                    const entity = world.createEntity();
                    world.spawn(entity, []);
                }

                // Create query
                const query = world.createQuery({
                    query: { tuple: [T.Position, T.Velocity] },
                });

                // Benchmark: iterate over query results
                let count = 0;
                for (let i = 0; i < query.length; i++) {
                    count++;
                }
            });

            bench(describeBenchmark('query iteration', scale, '90% match rate'), () => {
                const world = createWorld<BenchmarkComponent>();

                // Setup: 90% have Position + Velocity
                const matchCount = Math.floor(scale.count * 0.9);
                createMixedComponentDistribution(world, matchCount);

                // Fill rest with entities that don't match
                for (let i = matchCount; i < scale.count; i++) {
                    const entity = world.createEntity();
                    world.spawn(entity, []);
                }

                // Create query
                const query = world.createQuery({
                    query: { tuple: [T.Position, T.Velocity] },
                });

                // Benchmark: iterate over query results
                let count = 0;
                for (let i = 0; i < query.length; i++) {
                    count++;
                }
            });
        });
    });

    // Query with map function
    describe('query with map', () => {
        SCALES.forEach((scale) => {
            bench(describeBenchmark('query with map', scale), () => {
                const { world } = createPopulatedWorld({
                    entityCount: scale.count,
                    entityConfig: {
                        specificComponents: [T.Position, T.Velocity, T.Health],
                    },
                });

                // Benchmark: create query with map function
                const query = world.createQuery({
                    query: { tuple: [T.Position, T.Velocity] },
                    map: ([pos, vel]) => ({
                        x: pos.data.x,
                        y: pos.data.y,
                        dx: vel.data.dx,
                        dy: vel.data.dy,
                    }),
                });

                // Iterate to ensure map is applied
                let count = 0;
                for (let i = 0; i < query.length; i++) {
                    count++;
                }
            });

            bench(describeBenchmark('query without map', scale), () => {
                const { world } = createPopulatedWorld({
                    entityCount: scale.count,
                    entityConfig: {
                        specificComponents: [T.Position, T.Velocity, T.Health],
                    },
                });

                // Benchmark: create query without map function
                const query = world.createQuery({
                    query: { tuple: [T.Position, T.Velocity] },
                });

                // Iterate
                let count = 0;
                for (let i = 0; i < query.length; i++) {
                    count++;
                }
            });
        });
    });

    // Query with includeEntity
    describe('query with includeEntity', () => {
        SCALES.forEach((scale) => {
            bench(describeBenchmark('query with includeEntity', scale), () => {
                const { world } = createPopulatedWorld({
                    entityCount: scale.count,
                    entityConfig: {
                        specificComponents: [T.Position, T.Velocity],
                    },
                });

                // Benchmark: query with includeEntity
                const query = world.createQuery({
                    query: {
                        includeEntity: true,
                        tuple: [T.Position, T.Velocity],
                    },
                });

                // Iterate
                let count = 0;
                for (let i = 0; i < query.length; i++) {
                    count++;
                }
            });

            bench(describeBenchmark('query without includeEntity', scale), () => {
                const { world } = createPopulatedWorld({
                    entityCount: scale.count,
                    entityConfig: {
                        specificComponents: [T.Position, T.Velocity],
                    },
                });

                // Benchmark: query without includeEntity
                const query = world.createQuery({
                    query: { tuple: [T.Position, T.Velocity] },
                });

                // Iterate
                let count = 0;
                for (let i = 0; i < query.length; i++) {
                    count++;
                }
            });
        });
    });

    // Multiple queries on same world
    describe('multiple queries', () => {
        SCALES.forEach((scale) => {
            bench(describeBenchmark('5 queries on same world', scale), () => {
                const { world } = createPopulatedWorld({
                    entityCount: scale.count,
                    entityConfig: {
                        componentCount: 5,
                    },
                });

                // Benchmark: create 5 different queries
                world.createQuery({ query: { tuple: [T.Position] } });
                world.createQuery({ query: { tuple: [T.Position, T.Velocity] } });
                world.createQuery({ query: { tuple: [T.Position, T.Health] } });
                world.createQuery({ query: { tuple: [T.Velocity, T.Health] } });
                world.createQuery({ query: { tuple: [T.Position, T.Velocity, T.Health] } });
            });

            bench(describeBenchmark('10 queries on same world', scale), () => {
                const { world } = createPopulatedWorld({
                    entityCount: scale.count,
                    entityConfig: {
                        componentCount: 5,
                    },
                });

                // Benchmark: create 10 different queries
                world.createQuery({ query: { tuple: [T.Position] } });
                world.createQuery({ query: { tuple: [T.Velocity] } });
                world.createQuery({ query: { tuple: [T.Health] } });
                world.createQuery({ query: { tuple: [T.Position, T.Velocity] } });
                world.createQuery({ query: { tuple: [T.Position, T.Health] } });
                world.createQuery({ query: { tuple: [T.Velocity, T.Health] } });
                world.createQuery({ query: { tuple: [T.Position, T.Velocity, T.Health] } });
                world.createQuery({ query: { tuple: [T.Sprite] } });
                world.createQuery({ query: { tuple: [T.Collider] } });
                world.createQuery({ query: { tuple: [T.Position, T.Sprite] } });
            });
        });
    });
});
