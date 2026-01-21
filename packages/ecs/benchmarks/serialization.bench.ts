import { bench, describe } from 'vitest';
import { createWorld } from '../src/world';
import { BenchmarkComponent, createPopulatedWorld } from './fixtures';
import { SCALES, describeBenchmark } from './utils';

describe('Serialization Benchmarks', () => {
    // serialize benchmarks at different scales
    describe('serialize', () => {
        SCALES.forEach((scale) => {
            bench(describeBenchmark('serialize', scale), () => {
                // Setup: populate world with entities
                const { world } = createPopulatedWorld({
                    entityCount: scale.count,
                    entityConfig: {
                        componentCount: 3,
                        useRandomComponents: true,
                    },
                });

                // Benchmark: serialize the entire world
                world.serialize();
            });

            bench(describeBenchmark('serialize', scale, 'with 5 components per entity'), () => {
                // Setup: populate world with more components
                const { world } = createPopulatedWorld({
                    entityCount: scale.count,
                    entityConfig: {
                        componentCount: 5,
                        useRandomComponents: true,
                    },
                });

                // Benchmark: serialize the entire world
                world.serialize();
            });
        });
    });

    // deserialize benchmarks at different scales
    describe('deserialize', () => {
        SCALES.forEach((scale) => {
            bench(describeBenchmark('deserialize', scale), () => {
                // Setup: create and serialize a world
                const { world: sourceWorld } = createPopulatedWorld({
                    entityCount: scale.count,
                    entityConfig: {
                        componentCount: 3,
                        useRandomComponents: true,
                    },
                });

                const serialized = sourceWorld.serialize();

                // Benchmark: deserialize into a new world
                const world = createWorld<BenchmarkComponent>();
                world.deserialize(serialized);
            });

            bench(describeBenchmark('deserialize', scale, 'with 5 components per entity'), () => {
                // Setup: create and serialize a world with more components
                const { world: sourceWorld } = createPopulatedWorld({
                    entityCount: scale.count,
                    entityConfig: {
                        componentCount: 5,
                        useRandomComponents: true,
                    },
                });

                const serialized = sourceWorld.serialize();

                // Benchmark: deserialize into a new world
                const world = createWorld<BenchmarkComponent>();
                world.deserialize(serialized);
            });
        });
    });

    // Round-trip: serialize + deserialize
    describe('serialize + deserialize round-trip', () => {
        SCALES.forEach((scale) => {
            bench(describeBenchmark('round-trip', scale), () => {
                // Setup: populate world
                const { world: sourceWorld } = createPopulatedWorld({
                    entityCount: scale.count,
                    entityConfig: {
                        componentCount: 3,
                        useRandomComponents: true,
                    },
                });

                // Benchmark: serialize and deserialize
                const serialized = sourceWorld.serialize();
                const world = createWorld<BenchmarkComponent>();
                world.deserialize(serialized);
            });
        });
    });

    // Serialize with custom serialization function
    describe('serialize with custom serializer', () => {
        SCALES.forEach((scale) => {
            bench(describeBenchmark('serialize with custom serializer', scale), () => {
                // Setup: populate world
                const { world } = createPopulatedWorld({
                    entityCount: scale.count,
                    entityConfig: {
                        componentCount: 3,
                        useRandomComponents: true,
                    },
                });

                // Benchmark: serialize with custom serialization function
                world.serialize({
                    serializeComponent: (component) => {
                        // Custom serialization logic
                        return JSON.stringify(component);
                    },
                });
            });
        });
    });

    // Deserialize with custom deserialization function
    describe('deserialize with custom deserializer', () => {
        SCALES.forEach((scale) => {
            bench(describeBenchmark('deserialize with custom deserializer', scale), () => {
                // Setup: create and serialize a world
                const { world: sourceWorld } = createPopulatedWorld({
                    entityCount: scale.count,
                    entityConfig: {
                        componentCount: 3,
                        useRandomComponents: true,
                    },
                });

                const serialized = sourceWorld.serialize();

                // Benchmark: deserialize with custom deserialization function
                const world = createWorld<BenchmarkComponent>();
                world.deserialize(serialized, {
                    deserializeComponent: (serialized) => {
                        // Custom deserialization logic
                        return JSON.parse(serialized) as BenchmarkComponent;
                    },
                });
            });
        });
    });
});
