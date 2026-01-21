import { bench, describe } from 'vitest';
import { createWorld } from '../src/world';
import {
    BenchmarkComponent,
    T,
    createPosition,
    createVelocity,
    createHealth,
    createSprite,
    createCollider,
    generateEntityBatch,
} from './fixtures';
import { SCALES, describeBenchmark } from './utils';

describe('Query Updates Benchmarks', () => {
    // Measure overhead of query updates during spawn
    describe('spawn with query updates', () => {
        SCALES.forEach((scale) => {
            bench(describeBenchmark('spawn', scale, '0 queries'), () => {
                const world = createWorld<BenchmarkComponent>();
                const { components } = generateEntityBatch(scale.count, 3);

                // Benchmark: spawn without any queries
                for (let i = 0; i < scale.count; i++) {
                    const entity = world.createEntity();
                    world.spawn(entity, components[i]);
                }
            });

            bench(describeBenchmark('spawn', scale, '1 query'), () => {
                const world = createWorld<BenchmarkComponent>();
                const { components } = generateEntityBatch(scale.count, 3);

                // Create 1 query
                world.createQuery({ query: { tuple: [T.Position, T.Velocity] } });

                // Benchmark: spawn with 1 query to update
                for (let i = 0; i < scale.count; i++) {
                    const entity = world.createEntity();
                    world.spawn(entity, components[i]);
                }
            });

            bench(describeBenchmark('spawn', scale, '5 queries'), () => {
                const world = createWorld<BenchmarkComponent>();
                const { components } = generateEntityBatch(scale.count, 5);

                // Create 5 queries
                world.createQuery({ query: { tuple: [T.Position] } });
                world.createQuery({ query: { tuple: [T.Position, T.Velocity] } });
                world.createQuery({ query: { tuple: [T.Health] } });
                world.createQuery({ query: { tuple: [T.Position, T.Health] } });
                world.createQuery({ query: { tuple: [T.Velocity, T.Health] } });

                // Benchmark: spawn with 5 queries to update
                for (let i = 0; i < scale.count; i++) {
                    const entity = world.createEntity();
                    world.spawn(entity, components[i]);
                }
            });

            bench(describeBenchmark('spawn', scale, '10 queries'), () => {
                const world = createWorld<BenchmarkComponent>();
                const { components } = generateEntityBatch(scale.count, 5);

                // Create 10 queries
                world.createQuery({ query: { tuple: [T.Position] } });
                world.createQuery({ query: { tuple: [T.Velocity] } });
                world.createQuery({ query: { tuple: [T.Health] } });
                world.createQuery({ query: { tuple: [T.Sprite] } });
                world.createQuery({ query: { tuple: [T.Collider] } });
                world.createQuery({ query: { tuple: [T.Position, T.Velocity] } });
                world.createQuery({ query: { tuple: [T.Position, T.Health] } });
                world.createQuery({ query: { tuple: [T.Velocity, T.Health] } });
                world.createQuery({ query: { tuple: [T.Position, T.Velocity, T.Health] } });
                world.createQuery({ query: { tuple: [T.Sprite, T.Collider] } });

                // Benchmark: spawn with 10 queries to update
                for (let i = 0; i < scale.count; i++) {
                    const entity = world.createEntity();
                    world.spawn(entity, components[i]);
                }
            });
        });
    });

    // Measure overhead of query updates during addComponent
    describe('addComponent with query updates', () => {
        SCALES.forEach((scale) => {
            bench(describeBenchmark('addComponent', scale, '0 queries'), () => {
                const world = createWorld<BenchmarkComponent>();
                const entities = [];

                // Setup: spawn entities with Position
                for (let i = 0; i < scale.count; i++) {
                    const entity = world.createEntity();
                    world.spawn(entity, [createPosition()]);
                    entities.push(entity);
                }

                // Benchmark: add component without any queries
                for (let i = 0; i < scale.count; i++) {
                    world.addComponent(entities[i], createVelocity());
                }
            });

            bench(describeBenchmark('addComponent', scale, '1 query'), () => {
                const world = createWorld<BenchmarkComponent>();
                const entities = [];

                // Setup: spawn entities with Position
                for (let i = 0; i < scale.count; i++) {
                    const entity = world.createEntity();
                    world.spawn(entity, [createPosition()]);
                    entities.push(entity);
                }

                // Create 1 query
                world.createQuery({ query: { tuple: [T.Position, T.Velocity] } });

                // Benchmark: add component with 1 query to update
                for (let i = 0; i < scale.count; i++) {
                    world.addComponent(entities[i], createVelocity());
                }
            });

            bench(describeBenchmark('addComponent', scale, '5 queries'), () => {
                const world = createWorld<BenchmarkComponent>();
                const entities = [];

                // Setup: spawn entities with Position
                for (let i = 0; i < scale.count; i++) {
                    const entity = world.createEntity();
                    world.spawn(entity, [createPosition()]);
                    entities.push(entity);
                }

                // Create 5 queries
                world.createQuery({ query: { tuple: [T.Velocity] } });
                world.createQuery({ query: { tuple: [T.Position, T.Velocity] } });
                world.createQuery({ query: { tuple: [T.Velocity, T.Health] } });
                world.createQuery({ query: { tuple: [T.Velocity, T.Sprite] } });
                world.createQuery({ query: { tuple: [T.Position, T.Velocity, T.Health] } });

                // Benchmark: add component with 5 queries to update
                for (let i = 0; i < scale.count; i++) {
                    world.addComponent(entities[i], createVelocity());
                }
            });

            bench(describeBenchmark('addComponent', scale, '10 queries'), () => {
                const world = createWorld<BenchmarkComponent>();
                const entities = [];

                // Setup: spawn entities with Position
                for (let i = 0; i < scale.count; i++) {
                    const entity = world.createEntity();
                    world.spawn(entity, [createPosition()]);
                    entities.push(entity);
                }

                // Create 10 queries that include Velocity
                world.createQuery({ query: { tuple: [T.Velocity] } });
                world.createQuery({ query: { tuple: [T.Position, T.Velocity] } });
                world.createQuery({ query: { tuple: [T.Velocity, T.Health] } });
                world.createQuery({ query: { tuple: [T.Velocity, T.Sprite] } });
                world.createQuery({ query: { tuple: [T.Velocity, T.Collider] } });
                world.createQuery({ query: { tuple: [T.Position, T.Velocity, T.Health] } });
                world.createQuery({ query: { tuple: [T.Position, T.Velocity, T.Sprite] } });
                world.createQuery({ query: { tuple: [T.Velocity, T.Health, T.Sprite] } });
                world.createQuery({ query: { tuple: [T.Position, T.Velocity, T.Health, T.Sprite] } });
                world.createQuery({ query: { tuple: [T.Velocity, T.Sprite, T.Collider] } });

                // Benchmark: add component with 10 queries to update
                for (let i = 0; i < scale.count; i++) {
                    world.addComponent(entities[i], createVelocity());
                }
            });
        });
    });

    // Measure overhead of query updates during removeComponent
    describe('removeComponent with query updates', () => {
        SCALES.forEach((scale) => {
            bench(describeBenchmark('removeComponent', scale, '0 queries'), () => {
                const world = createWorld<BenchmarkComponent>();
                const entities = [];

                // Setup: spawn entities with Position and Velocity
                for (let i = 0; i < scale.count; i++) {
                    const entity = world.createEntity();
                    world.spawn(entity, [createPosition(), createVelocity()]);
                    entities.push(entity);
                }

                // Benchmark: remove component without any queries
                for (let i = 0; i < scale.count; i++) {
                    world.removeComponent(entities[i], T.Velocity);
                }
            });

            bench(describeBenchmark('removeComponent', scale, '1 query'), () => {
                const world = createWorld<BenchmarkComponent>();
                const entities = [];

                // Setup: spawn entities with Position and Velocity
                for (let i = 0; i < scale.count; i++) {
                    const entity = world.createEntity();
                    world.spawn(entity, [createPosition(), createVelocity()]);
                    entities.push(entity);
                }

                // Create 1 query
                world.createQuery({ query: { tuple: [T.Position, T.Velocity] } });

                // Benchmark: remove component with 1 query to update
                for (let i = 0; i < scale.count; i++) {
                    world.removeComponent(entities[i], T.Velocity);
                }
            });

            bench(describeBenchmark('removeComponent', scale, '5 queries'), () => {
                const world = createWorld<BenchmarkComponent>();
                const entities = [];

                // Setup: spawn entities with multiple components
                for (let i = 0; i < scale.count; i++) {
                    const entity = world.createEntity();
                    world.spawn(entity, [createPosition(), createVelocity(), createHealth(), createSprite()]);
                    entities.push(entity);
                }

                // Create 5 queries
                world.createQuery({ query: { tuple: [T.Velocity] } });
                world.createQuery({ query: { tuple: [T.Position, T.Velocity] } });
                world.createQuery({ query: { tuple: [T.Velocity, T.Health] } });
                world.createQuery({ query: { tuple: [T.Velocity, T.Sprite] } });
                world.createQuery({ query: { tuple: [T.Position, T.Velocity, T.Health] } });

                // Benchmark: remove component with 5 queries to update
                for (let i = 0; i < scale.count; i++) {
                    world.removeComponent(entities[i], T.Velocity);
                }
            });

            bench(describeBenchmark('removeComponent', scale, '10 queries'), () => {
                const world = createWorld<BenchmarkComponent>();
                const entities = [];

                // Setup: spawn entities with multiple components
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

                // Create 10 queries that include Velocity
                world.createQuery({ query: { tuple: [T.Velocity] } });
                world.createQuery({ query: { tuple: [T.Position, T.Velocity] } });
                world.createQuery({ query: { tuple: [T.Velocity, T.Health] } });
                world.createQuery({ query: { tuple: [T.Velocity, T.Sprite] } });
                world.createQuery({ query: { tuple: [T.Velocity, T.Collider] } });
                world.createQuery({ query: { tuple: [T.Position, T.Velocity, T.Health] } });
                world.createQuery({ query: { tuple: [T.Position, T.Velocity, T.Sprite] } });
                world.createQuery({ query: { tuple: [T.Velocity, T.Health, T.Sprite] } });
                world.createQuery({ query: { tuple: [T.Position, T.Velocity, T.Health, T.Sprite] } });
                world.createQuery({ query: { tuple: [T.Velocity, T.Sprite, T.Collider] } });

                // Benchmark: remove component with 10 queries to update
                for (let i = 0; i < scale.count; i++) {
                    world.removeComponent(entities[i], T.Velocity);
                }
            });
        });
    });

    // Measure overhead of query updates during despawn
    describe('despawn with query updates', () => {
        SCALES.forEach((scale) => {
            bench(describeBenchmark('despawn', scale, '0 queries'), () => {
                const world = createWorld<BenchmarkComponent>();
                const entities = [];

                // Setup: spawn entities
                for (let i = 0; i < scale.count; i++) {
                    const entity = world.createEntity();
                    world.spawn(entity, [createPosition(), createVelocity(), createHealth()]);
                    entities.push(entity);
                }

                // Benchmark: despawn without any queries
                for (let i = 0; i < scale.count; i++) {
                    world.despawn(entities[i]);
                }
            });

            bench(describeBenchmark('despawn', scale, '1 query'), () => {
                const world = createWorld<BenchmarkComponent>();
                const entities = [];

                // Setup: spawn entities
                for (let i = 0; i < scale.count; i++) {
                    const entity = world.createEntity();
                    world.spawn(entity, [createPosition(), createVelocity(), createHealth()]);
                    entities.push(entity);
                }

                // Create 1 query
                world.createQuery({ query: { tuple: [T.Position, T.Velocity] } });

                // Benchmark: despawn with 1 query to update
                for (let i = 0; i < scale.count; i++) {
                    world.despawn(entities[i]);
                }
            });

            bench(describeBenchmark('despawn', scale, '5 queries'), () => {
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
                world.createQuery({ query: { tuple: [T.Position] } });
                world.createQuery({ query: { tuple: [T.Position, T.Velocity] } });
                world.createQuery({ query: { tuple: [T.Health] } });
                world.createQuery({ query: { tuple: [T.Position, T.Health] } });
                world.createQuery({ query: { tuple: [T.Velocity, T.Health] } });

                // Benchmark: despawn with 5 queries to update
                for (let i = 0; i < scale.count; i++) {
                    world.despawn(entities[i]);
                }
            });

            bench(describeBenchmark('despawn', scale, '10 queries'), () => {
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
                world.createQuery({ query: { tuple: [T.Position] } });
                world.createQuery({ query: { tuple: [T.Velocity] } });
                world.createQuery({ query: { tuple: [T.Health] } });
                world.createQuery({ query: { tuple: [T.Sprite] } });
                world.createQuery({ query: { tuple: [T.Collider] } });
                world.createQuery({ query: { tuple: [T.Position, T.Velocity] } });
                world.createQuery({ query: { tuple: [T.Position, T.Health] } });
                world.createQuery({ query: { tuple: [T.Velocity, T.Health] } });
                world.createQuery({ query: { tuple: [T.Position, T.Velocity, T.Health] } });
                world.createQuery({ query: { tuple: [T.Sprite, T.Collider] } });

                // Benchmark: despawn with 10 queries to update
                for (let i = 0; i < scale.count; i++) {
                    world.despawn(entities[i]);
                }
            });
        });
    });
});
