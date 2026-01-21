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
} from './fixtures';
import { SCALES, describeBenchmark } from './utils';

describe('Combined Scenarios Benchmarks', () => {
    // Realistic game loop simulation
    describe('game loop simulation', () => {
        SCALES.forEach((scale) => {
            bench(describeBenchmark('game loop', scale, 'spawn + query + update + despawn'), () => {
                const world = createWorld<BenchmarkComponent>();

                // Create queries (typical game queries)
                const movementQuery = world.createQuery({
                    query: { tuple: [T.Position, T.Velocity] },
                });

                world.createQuery({
                    query: { tuple: [T.Position, T.Sprite] },
                });

                // Simulate game loop: spawn entities
                const entities = [];
                for (let i = 0; i < scale.count * 0.8; i++) {
                    const entity = world.createEntity();
                    world.spawn(entity, [
                        createPosition(i * 10, i * 10),
                        createVelocity(1, 1),
                        createHealth(),
                        createSprite(),
                    ]);
                    entities.push(entity);
                }

                // Update phase: iterate queries and modify components
                for (let i = 0; i < movementQuery.length; i++) {
                    const [pos, vel] = movementQuery[i];
                    pos.data.x += vel.data.dx;
                    pos.data.y += vel.data.dy;
                }

                // Spawn new entities during update (20%)
                for (let i = 0; i < scale.count * 0.2; i++) {
                    const entity = world.createEntity();
                    world.spawn(entity, [createPosition(), createVelocity(), createSprite()]);
                    entities.push(entity);
                }

                // Despawn some entities (10%)
                const despawnCount = Math.floor(entities.length * 0.1);
                for (let i = 0; i < despawnCount; i++) {
                    world.despawn(entities[i]);
                }
            });
        });
    });

    // Batch spawn scenario
    describe('batch operations', () => {
        SCALES.forEach((scale) => {
            bench(describeBenchmark('batch spawn', scale), () => {
                const world = createWorld<BenchmarkComponent>();

                // Benchmark: spawn many entities at once
                for (let i = 0; i < scale.count; i++) {
                    const entity = world.createEntity();
                    world.spawn(entity, [createPosition(), createVelocity(), createHealth()]);
                }
            });

            bench(describeBenchmark('batch despawn', scale), () => {
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
        });
    });

    // Component churn scenario - rapidly add/remove components
    describe('component churn scenario', () => {
        SCALES.forEach((scale) => {
            bench(describeBenchmark('component churn', scale), () => {
                const world = createWorld<BenchmarkComponent>();
                const entities = [];

                // Setup: spawn entities with base component
                for (let i = 0; i < scale.count; i++) {
                    const entity = world.createEntity();
                    world.spawn(entity, [createPosition()]);
                    entities.push(entity);
                }

                // Benchmark: rapidly add and remove components
                for (let i = 0; i < entities.length; i++) {
                    // Simulate entity gaining/losing components over time
                    world.addComponent(entities[i], createVelocity());
                    world.addComponent(entities[i], createHealth());
                    world.removeComponent(entities[i], T.Velocity);
                    world.addComponent(entities[i], createSprite());
                    world.removeComponent(entities[i], T.Health);
                    world.addComponent(entities[i], createCollider());
                }
            });
        });
    });

    // Query-heavy workload
    describe('query-heavy workload', () => {
        SCALES.forEach((scale) => {
            bench(describeBenchmark('query-heavy', scale, 'many queries + frequent updates'), () => {
                const world = createWorld<BenchmarkComponent>();

                // Create many queries
                const queries = [];
                queries.push(world.createQuery({ query: { tuple: [T.Position] } }));
                queries.push(world.createQuery({ query: { tuple: [T.Velocity] } }));
                queries.push(world.createQuery({ query: { tuple: [T.Health] } }));
                queries.push(world.createQuery({ query: { tuple: [T.Position, T.Velocity] } }));
                queries.push(world.createQuery({ query: { tuple: [T.Position, T.Health] } }));
                queries.push(world.createQuery({ query: { tuple: [T.Velocity, T.Health] } }));
                queries.push(world.createQuery({ query: { tuple: [T.Position, T.Velocity, T.Health] } }));
                queries.push(world.createQuery({ query: { tuple: [T.Sprite] } }));
                queries.push(world.createQuery({ query: { tuple: [T.Position, T.Sprite] } }));
                queries.push(world.createQuery({ query: { tuple: [T.Velocity, T.Sprite] } }));

                // Spawn entities (triggers query updates)
                const entities = [];
                for (let i = 0; i < scale.count; i++) {
                    const entity = world.createEntity();
                    world.spawn(entity, [createPosition(), createVelocity(), createHealth()]);
                    entities.push(entity);
                }

                // Add/remove components (triggers more query updates)
                for (let i = 0; i < entities.length / 2; i++) {
                    world.addComponent(entities[i], createSprite());
                }

                for (let i = 0; i < entities.length / 4; i++) {
                    world.removeComponent(entities[i], T.Health);
                }
            });
        });
    });

    // Event-heavy workload
    describe('event-heavy workload', () => {
        SCALES.forEach((scale) => {
            bench(describeBenchmark('event-heavy', scale, 'many event emissions'), () => {
                const world = createWorld<BenchmarkComponent>();

                // Setup: subscribe to all ECS events
                let eventCount = 0;
                world.on('ecs/spawn-entity', () => eventCount++);
                world.on('ecs/despawn-entity', () => eventCount++);
                world.on('ecs/add-component', () => eventCount++);
                world.on('ecs/remove-component', () => eventCount++);

                // Benchmark: operations that trigger many events
                const entities = [];

                // Spawn (triggers events)
                for (let i = 0; i < scale.count; i++) {
                    const entity = world.createEntity();
                    world.spawn(entity, [createPosition()]);
                    entities.push(entity);
                }

                // Add components (triggers events)
                for (let i = 0; i < entities.length; i++) {
                    world.addComponent(entities[i], createVelocity());
                }

                // Remove components (triggers events)
                for (let i = 0; i < entities.length; i++) {
                    world.removeComponent(entities[i], T.Velocity);
                }

                // Despawn (triggers events)
                for (let i = 0; i < entities.length; i++) {
                    world.despawn(entities[i]);
                }
            });
        });
    });

    // Realistic mixed workload
    describe('mixed workload', () => {
        SCALES.forEach((scale) => {
            bench(describeBenchmark('mixed workload', scale, 'realistic game simulation'), () => {
                const world = createWorld<BenchmarkComponent>();

                // Setup: create queries
                world.createQuery({
                    query: { tuple: [T.Position] },
                });

                const movableEntities = world.createQuery({
                    query: { tuple: [T.Position, T.Velocity] },
                });

                world.createQuery({
                    query: { tuple: [T.Health] },
                });

                // Phase 1: Initial spawn (70% of entities)
                const entities = [];
                const initialCount = Math.floor(scale.count * 0.7);
                for (let i = 0; i < initialCount; i++) {
                    const entity = world.createEntity();
                    world.spawn(entity, [createPosition(), createVelocity(), createHealth()]);
                    entities.push(entity);
                }

                // Phase 2: Update existing entities
                for (let i = 0; i < movableEntities.length; i++) {
                    const [pos, vel] = movableEntities[i];
                    pos.data.x += vel.data.dx;
                    pos.data.y += vel.data.dy;
                }

                // Phase 3: Spawn new entities (20%)
                const newCount = Math.floor(scale.count * 0.2);
                for (let i = 0; i < newCount; i++) {
                    const entity = world.createEntity();
                    world.spawn(entity, [createPosition(), createSprite()]);
                    entities.push(entity);
                }

                // Phase 4: Modify components on 30% of entities
                const modifyCount = Math.floor(entities.length * 0.3);
                for (let i = 0; i < modifyCount; i++) {
                    world.addComponent(entities[i], createSprite());
                }

                // Phase 5: Remove some components
                const removeCount = Math.floor(entities.length * 0.15);
                for (let i = 0; i < removeCount; i++) {
                    if (world.getComponent(entities[i], T.Health)) {
                        world.removeComponent(entities[i], T.Health);
                    }
                }

                // Phase 6: Despawn dead entities (10%)
                const despawnCount = Math.floor(entities.length * 0.1);
                for (let i = 0; i < despawnCount; i++) {
                    world.despawn(entities[i]);
                }
            });
        });
    });
});
