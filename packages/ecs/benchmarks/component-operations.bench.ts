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
    createPopulatedWorld,
} from './fixtures';
import { SCALES, describeBenchmark } from './utils';

describe('Component Operations Benchmarks', () => {
    // addComponent benchmarks
    describe('addComponent', () => {
        SCALES.forEach((scale) => {
            bench(describeBenchmark('addComponent', scale, 'no query impact'), () => {
                // Setup: world with entities that have Position and Velocity
                const { world, entities } = createPopulatedWorld({
                    entityCount: scale.count,
                    entityConfig: {
                        specificComponents: [T.Position, T.Velocity],
                    },
                });

                // Create queries that won't be affected by adding Health
                world.createQuery({ query: { tuple: [T.Position, T.Velocity] } });
                world.createQuery({ query: { tuple: [T.Position] } });

                // Benchmark: add Health component (doesn't match existing queries)
                for (let i = 0; i < scale.count; i++) {
                    world.addComponent(entities[i], createHealth());
                }
            });

            bench(describeBenchmark('addComponent', scale, 'triggers 1 query update'), () => {
                // Setup: world with entities that have Position
                const { world, entities } = createPopulatedWorld({
                    entityCount: scale.count,
                    entityConfig: {
                        specificComponents: [T.Position],
                    },
                });

                // Create a query that will be triggered when Velocity is added
                world.createQuery({ query: { tuple: [T.Position, T.Velocity] } });

                // Benchmark: add Velocity (triggers query update)
                for (let i = 0; i < scale.count; i++) {
                    world.addComponent(entities[i], createVelocity());
                }
            });

            bench(describeBenchmark('addComponent', scale, 'triggers 5 query updates'), () => {
                // Setup: world with entities that have Position
                const { world, entities } = createPopulatedWorld({
                    entityCount: scale.count,
                    entityConfig: {
                        specificComponents: [T.Position],
                    },
                });

                // Create 5 queries that will be triggered
                world.createQuery({ query: { tuple: [T.Position, T.Velocity] } });
                world.createQuery({ query: { tuple: [T.Velocity] } });
                world.createQuery({ query: { tuple: [T.Velocity, T.Health] } });
                world.createQuery({ query: { tuple: [T.Position, T.Velocity, T.Health] } });
                world.createQuery({ query: { tuple: [T.Velocity, T.Sprite] } });

                // Benchmark: add Velocity (triggers all 5 queries)
                for (let i = 0; i < scale.count; i++) {
                    world.addComponent(entities[i], createVelocity());
                }
            });
        });
    });

    // removeComponent benchmarks
    describe('removeComponent', () => {
        SCALES.forEach((scale) => {
            bench(describeBenchmark('removeComponent', scale, 'no query impact'), () => {
                // Setup: world with entities that have Position, Velocity, and Health
                const { world, entities } = createPopulatedWorld({
                    entityCount: scale.count,
                    entityConfig: {
                        specificComponents: [T.Position, T.Velocity, T.Health],
                    },
                });

                // Create queries that won't be affected by removing Health
                world.createQuery({ query: { tuple: [T.Position, T.Velocity] } });
                world.createQuery({ query: { tuple: [T.Position] } });

                // Benchmark: remove Health component (doesn't affect queries)
                for (let i = 0; i < scale.count; i++) {
                    world.removeComponent(entities[i], T.Health);
                }
            });

            bench(describeBenchmark('removeComponent', scale, 'triggers 1 query update'), () => {
                // Setup: world with entities that have Position and Velocity
                const { world, entities } = createPopulatedWorld({
                    entityCount: scale.count,
                    entityConfig: {
                        specificComponents: [T.Position, T.Velocity],
                    },
                });

                // Create a query that will be affected when Velocity is removed
                world.createQuery({ query: { tuple: [T.Position, T.Velocity] } });

                // Benchmark: remove Velocity (triggers query update)
                for (let i = 0; i < scale.count; i++) {
                    world.removeComponent(entities[i], T.Velocity);
                }
            });

            bench(describeBenchmark('removeComponent', scale, 'triggers 5 query updates'), () => {
                // Setup: world with entities that have multiple components
                const { world, entities } = createPopulatedWorld({
                    entityCount: scale.count,
                    entityConfig: {
                        specificComponents: [T.Position, T.Velocity, T.Health, T.Sprite],
                    },
                });

                // Create 5 queries that will be affected
                world.createQuery({ query: { tuple: [T.Position, T.Velocity] } });
                world.createQuery({ query: { tuple: [T.Velocity] } });
                world.createQuery({ query: { tuple: [T.Velocity, T.Health] } });
                world.createQuery({ query: { tuple: [T.Velocity, T.Sprite] } });
                world.createQuery({ query: { tuple: [T.Position, T.Velocity, T.Health] } });

                // Benchmark: remove Velocity (triggers all 5 queries)
                for (let i = 0; i < scale.count; i++) {
                    world.removeComponent(entities[i], T.Velocity);
                }
            });
        });
    });

    // getComponent benchmarks
    describe('getComponent', () => {
        SCALES.forEach((scale) => {
            bench(describeBenchmark('getComponent', scale, 'existing component'), () => {
                // Setup: world with entities
                const { world, entities } = createPopulatedWorld({
                    entityCount: scale.count,
                    entityConfig: {
                        specificComponents: [T.Position, T.Velocity, T.Health],
                    },
                });

                // Benchmark: get existing component
                for (let i = 0; i < scale.count; i++) {
                    world.getComponent(entities[i], T.Position);
                }
            });

            bench(describeBenchmark('getComponent', scale, 'non-existent component'), () => {
                // Setup: world with entities (without Sprite)
                const { world, entities } = createPopulatedWorld({
                    entityCount: scale.count,
                    entityConfig: {
                        specificComponents: [T.Position, T.Velocity, T.Health],
                    },
                });

                // Benchmark: get non-existent component
                for (let i = 0; i < scale.count; i++) {
                    world.getComponent(entities[i], T.Sprite);
                }
            });
        });
    });

    // Combined operations: add + remove cycle
    describe('addComponent + removeComponent cycle', () => {
        SCALES.forEach((scale) => {
            bench(describeBenchmark('add + remove cycle', scale), () => {
                // Setup: world with entities
                const { world, entities } = createPopulatedWorld({
                    entityCount: scale.count,
                    entityConfig: {
                        specificComponents: [T.Position, T.Velocity],
                    },
                });

                // Benchmark: repeatedly add and remove a component
                for (let i = 0; i < scale.count; i++) {
                    world.addComponent(entities[i], createHealth());
                    world.removeComponent(entities[i], T.Health);
                }
            });
        });
    });

    // Component churn: rapid add/remove on same entity
    describe('component churn', () => {
        SCALES.forEach((scale) => {
            bench(describeBenchmark('component churn', scale, '10 add/remove cycles'), () => {
                const world = createWorld<BenchmarkComponent>();
                const entities = [];

                // Setup: spawn entities with base components
                for (let i = 0; i < scale.count; i++) {
                    const entity = world.createEntity();
                    world.spawn(entity, [createPosition()]);
                    entities.push(entity);
                }

                // Benchmark: 10 cycles of add/remove per entity
                for (let i = 0; i < entities.length; i++) {
                    for (let cycle = 0; cycle < 10; cycle++) {
                        world.addComponent(entities[i], createHealth());
                        world.addComponent(entities[i], createSprite());
                        world.addComponent(entities[i], createCollider());
                        world.removeComponent(entities[i], T.Health);
                        world.removeComponent(entities[i], T.Sprite);
                        world.removeComponent(entities[i], T.Collider);
                    }
                }
            });
        });
    });
});
