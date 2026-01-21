import { bench, describe } from 'vitest';
import { createWorld } from '../src/world';
import { BenchmarkComponent, T, createPosition } from './fixtures';
import { SCALES, describeBenchmark } from './utils';
import { DefineEcsEvent } from '../src/event';

// Define custom events for benchmarks
type CustomEventA = DefineEcsEvent<'custom/event-a'>;
type CustomEventB = DefineEcsEvent<'custom/event-b', { value: number }>;
type CustomEventC = DefineEcsEvent<'custom/event-c', { data: string }>;
type BenchmarkEvent = CustomEventA | CustomEventB | CustomEventC;

describe('Event System Benchmarks', () => {
    // Event subscription benchmarks
    describe('on - subscribe to events', () => {
        SCALES.forEach((scale) => {
            bench(describeBenchmark('on', scale, '1 subscriber per event'), () => {
                const world = createWorld<BenchmarkComponent, BenchmarkEvent>();

                // Benchmark: subscribe 1 handler to each event type
                for (let i = 0; i < scale.count; i++) {
                    world.on('custom/event-a', () => {});
                    world.on('custom/event-b', () => {});
                    world.on('custom/event-c', () => {});
                }
            });

            bench(describeBenchmark('on', scale, 'subscribe to built-in events'), () => {
                const world = createWorld<BenchmarkComponent>();

                // Benchmark: subscribe to built-in ECS events
                for (let i = 0; i < scale.count; i++) {
                    world.on('ecs/spawn-entity', () => {});
                    world.on('ecs/despawn-entity', () => {});
                    world.on('ecs/add-component', () => {});
                    world.on('ecs/remove-component', () => {});
                }
            });
        });
    });

    // Event emission benchmarks
    describe('emit - no subscribers', () => {
        SCALES.forEach((scale) => {
            bench(describeBenchmark('emit', scale, 'no subscribers'), () => {
                const world = createWorld<BenchmarkComponent, BenchmarkEvent>();

                // Benchmark: emit events with no subscribers
                for (let i = 0; i < scale.count; i++) {
                    world.emit({ type: 'custom/event-a' });
                }
            });
        });
    });

    describe('emit - with subscribers', () => {
        SCALES.forEach((scale) => {
            bench(describeBenchmark('emit', scale, '1 subscriber'), () => {
                const world = createWorld<BenchmarkComponent, BenchmarkEvent>();

                // Setup: 1 subscriber
                let callCount = 0;
                world.on('custom/event-a', () => {
                    callCount++;
                });

                // Benchmark: emit events
                for (let i = 0; i < scale.count; i++) {
                    world.emit({ type: 'custom/event-a' });
                }
            });

            bench(describeBenchmark('emit', scale, '10 subscribers'), () => {
                const world = createWorld<BenchmarkComponent, BenchmarkEvent>();

                // Setup: 10 subscribers
                for (let i = 0; i < 10; i++) {
                    let callCount = 0;
                    world.on('custom/event-a', () => {
                        callCount++;
                    });
                }

                // Benchmark: emit events
                for (let i = 0; i < scale.count; i++) {
                    world.emit({ type: 'custom/event-a' });
                }
            });

            bench(describeBenchmark('emit', scale, '100 subscribers'), () => {
                const world = createWorld<BenchmarkComponent, BenchmarkEvent>();

                // Setup: 100 subscribers
                for (let i = 0; i < 100; i++) {
                    let callCount = 0;
                    world.on('custom/event-a', () => {
                        callCount++;
                    });
                }

                // Benchmark: emit events
                for (let i = 0; i < scale.count; i++) {
                    world.emit({ type: 'custom/event-a' });
                }
            });
        });
    });

    // Events with payloads
    describe('emit - with payloads', () => {
        SCALES.forEach((scale) => {
            bench(describeBenchmark('emit with payload', scale, '1 subscriber'), () => {
                const world = createWorld<BenchmarkComponent, BenchmarkEvent>();

                // Setup: 1 subscriber
                world.on('custom/event-b', () => {});

                // Benchmark: emit events with payload
                for (let i = 0; i < scale.count; i++) {
                    world.emit({ type: 'custom/event-b', payload: { value: i } });
                }
            });

            bench(describeBenchmark('emit with payload', scale, '10 subscribers'), () => {
                const world = createWorld<BenchmarkComponent, BenchmarkEvent>();

                // Setup: 10 subscribers
                for (let i = 0; i < 10; i++) {
                    world.on('custom/event-b', () => {});
                }

                // Benchmark: emit events with payload
                for (let i = 0; i < scale.count; i++) {
                    world.emit({ type: 'custom/event-b', payload: { value: i } });
                }
            });
        });
    });

    // Built-in ECS events
    describe('built-in ECS events', () => {
        SCALES.forEach((scale) => {
            bench(describeBenchmark('built-in events', scale, 'spawn triggers event'), () => {
                const world = createWorld<BenchmarkComponent>();

                // Setup: subscribe to spawn event
                let spawnCount = 0;
                world.on('ecs/spawn-entity', () => {
                    spawnCount++;
                });

                // Benchmark: spawn entities (triggers events)
                for (let i = 0; i < scale.count; i++) {
                    const entity = world.createEntity();
                    world.spawn(entity, [createPosition()]);
                }
            });

            bench(describeBenchmark('built-in events', scale, 'despawn triggers event'), () => {
                const world = createWorld<BenchmarkComponent>();
                const entities = [];

                // Setup: spawn entities
                for (let i = 0; i < scale.count; i++) {
                    const entity = world.createEntity();
                    world.spawn(entity, [createPosition()]);
                    entities.push(entity);
                }

                // Setup: subscribe to despawn event
                let despawnCount = 0;
                world.on('ecs/despawn-entity', () => {
                    despawnCount++;
                });

                // Benchmark: despawn entities (triggers events)
                for (let i = 0; i < scale.count; i++) {
                    world.despawn(entities[i]);
                }
            });

            bench(describeBenchmark('built-in events', scale, 'addComponent triggers event'), () => {
                const world = createWorld<BenchmarkComponent>();
                const entities = [];

                // Setup: spawn entities with Position
                for (let i = 0; i < scale.count; i++) {
                    const entity = world.createEntity();
                    world.spawn(entity, [createPosition()]);
                    entities.push(entity);
                }

                // Setup: subscribe to add component event
                let addCount = 0;
                world.on('ecs/add-component', () => {
                    addCount++;
                });

                // Benchmark: add components (triggers events)
                for (let i = 0; i < scale.count; i++) {
                    world.addComponent(entities[i], { type: T.Velocity, data: { dx: 0, dy: 0 } });
                }
            });

            bench(describeBenchmark('built-in events', scale, 'removeComponent triggers event'), () => {
                const world = createWorld<BenchmarkComponent>();
                const entities = [];

                // Setup: spawn entities with Position and Velocity
                for (let i = 0; i < scale.count; i++) {
                    const entity = world.createEntity();
                    world.spawn(entity, [createPosition(), { type: T.Velocity, data: { dx: 0, dy: 0 } }]);
                    entities.push(entity);
                }

                // Setup: subscribe to remove component event
                let removeCount = 0;
                world.on('ecs/remove-component', () => {
                    removeCount++;
                });

                // Benchmark: remove components (triggers events)
                for (let i = 0; i < scale.count; i++) {
                    world.removeComponent(entities[i], T.Velocity);
                }
            });
        });
    });

    // Mixed event types
    describe('emit - mixed event types', () => {
        SCALES.forEach((scale) => {
            bench(describeBenchmark('emit mixed events', scale), () => {
                const world = createWorld<BenchmarkComponent, BenchmarkEvent>();

                // Setup: subscribers for all event types
                world.on('custom/event-a', () => {});
                world.on('custom/event-b', () => {});
                world.on('custom/event-c', () => {});

                // Benchmark: emit different event types in rotation
                for (let i = 0; i < scale.count; i++) {
                    const eventType = i % 3;
                    if (eventType === 0) {
                        world.emit({ type: 'custom/event-a' });
                    } else if (eventType === 1) {
                        world.emit({ type: 'custom/event-b', payload: { value: i } });
                    } else {
                        world.emit({ type: 'custom/event-c', payload: { data: 'test' } });
                    }
                }
            });
        });
    });
});
