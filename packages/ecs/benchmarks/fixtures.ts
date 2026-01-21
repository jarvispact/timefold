import { Component, createComponent, defineComponentTypes } from '../src/component';
import { createWorld, World } from '../src/world';
import { Entity } from '../src/entity';

// Define component types for benchmarks
const { T, typeNames } = defineComponentTypes([
    'Position',
    'Velocity',
    'Health',
    'Sprite',
    'Collider',
    'AI',
    'Transform',
    'Renderable',
]);

export { T, typeNames };

// Component type definitions
export type Position = Component<typeof T.Position, { x: number; y: number }>;
export type Velocity = Component<typeof T.Velocity, { dx: number; dy: number }>;
export type Health = Component<typeof T.Health, { current: number; max: number }>;
export type Sprite = Component<typeof T.Sprite, { texture: string; layer: number }>;
export type Collider = Component<typeof T.Collider, { radius: number }>;
export type AI = Component<typeof T.AI, { state: string; target: number | null }>;
export type Transform = Component<typeof T.Transform, { rotation: number; scale: number }>;
export type Renderable = Component<typeof T.Renderable>;

export type BenchmarkComponent = Position | Velocity | Health | Sprite | Collider | AI | Transform | Renderable;

// Component factory functions
export function createPosition(x = 0, y = 0): Position {
    return createComponent(T.Position, { x, y });
}

export function createVelocity(dx = 0, dy = 0): Velocity {
    return createComponent(T.Velocity, { dx, dy });
}

export function createHealth(current = 100, max = 100): Health {
    return createComponent(T.Health, { current, max });
}

export function createSprite(texture = 'default', layer = 0): Sprite {
    return createComponent(T.Sprite, { texture, layer });
}

export function createCollider(radius = 1): Collider {
    return createComponent(T.Collider, { radius });
}

export function createAI(state = 'idle', target: number | null = null): AI {
    return createComponent(T.AI, { state, target });
}

export function createTransform(rotation = 0, scale = 1): Transform {
    return createComponent(T.Transform, { rotation, scale });
}

export function createRenderable(): Renderable {
    return createComponent(T.Renderable);
}

// Seeded random number generator for reproducible benchmarks
class SeededRandom {
    private seed: number;

    constructor(seed: number) {
        this.seed = seed;
    }

    next(): number {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    nextInt(min: number, max: number): number {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    nextFloat(min: number, max: number): number {
        return this.next() * (max - min) + min;
    }
}

export interface EntityConfig {
    componentCount?: number;
    specificComponents?: (typeof T)[keyof typeof T][];
    useRandomComponents?: boolean;
}

export interface WorldConfig {
    entityCount: number;
    entityConfig?: EntityConfig;
}

/**
 * Create a world pre-populated with entities
 */
export function createPopulatedWorld(config: WorldConfig): {
    world: World<BenchmarkComponent>;
    entities: Entity[];
} {
    const world = createWorld<BenchmarkComponent>();
    const entities: Entity[] = [];
    const rng = new SeededRandom(42);

    const { entityCount, entityConfig = {} } = config;
    const { componentCount = 3, specificComponents, useRandomComponents = false } = entityConfig;

    for (let i = 0; i < entityCount; i++) {
        const entity = world.createEntity();
        const components: BenchmarkComponent[] = [];

        if (specificComponents) {
            // Use specific components
            for (const componentType of specificComponents) {
                components.push(createRandomComponent(componentType, rng));
            }
        } else if (useRandomComponents) {
            // Use random components
            const availableTypes = Object.values(T);
            const selectedTypes = new Set<number>();

            while (selectedTypes.size < componentCount && selectedTypes.size < availableTypes.length) {
                const randomType = availableTypes[rng.nextInt(0, availableTypes.length - 1)];
                selectedTypes.add(randomType);
            }

            for (const componentType of selectedTypes) {
                components.push(createRandomComponent(componentType, rng));
            }
        } else {
            // Use first N component types
            const componentTypes = Object.values(T).slice(0, componentCount);
            for (const componentType of componentTypes) {
                components.push(createRandomComponent(componentType, rng));
            }
        }

        world.spawn(entity, components);
        entities.push(entity);
    }

    return { world, entities };
}

/**
 * Create a random component of the specified type
 */
function createRandomComponent(componentType: number, rng: SeededRandom): BenchmarkComponent {
    switch (componentType) {
        case T.Position:
            return createPosition(rng.nextFloat(-1000, 1000), rng.nextFloat(-1000, 1000));
        case T.Velocity:
            return createVelocity(rng.nextFloat(-10, 10), rng.nextFloat(-10, 10));
        case T.Health:
            return createHealth(rng.nextInt(50, 100), 100);
        case T.Sprite:
            return createSprite(`texture_${rng.nextInt(0, 10)}`, rng.nextInt(0, 5));
        case T.Collider:
            return createCollider(rng.nextFloat(0.5, 5));
        case T.AI:
            return createAI(['idle', 'patrol', 'chase', 'attack'][rng.nextInt(0, 3)], null);
        case T.Transform:
            return createTransform(rng.nextFloat(0, Math.PI * 2), rng.nextFloat(0.5, 2));
        case T.Renderable:
            return createRenderable();
        default:
            return createPosition();
    }
}

/**
 * Create multiple queries on a world
 */
export function createQueries(world: World<BenchmarkComponent>, queryCount: number) {
    const queries = [];
    const componentTypes = Object.values(T);

    for (let i = 0; i < queryCount; i++) {
        // Create queries with 2-3 components each
        const querySize = 2 + (i % 2);
        const queryComponentTypes = componentTypes.slice(i % 3, (i % 3) + querySize);

        const query = world.createQuery({
            query: {
                tuple: queryComponentTypes,
            },
        });

        queries.push(query);
    }

    return queries;
}

/**
 * Generate entities for batch operations
 */
export function generateEntityBatch(
    count: number,
    componentCount = 3,
): {
    entities: Entity[];
    components: BenchmarkComponent[][];
} {
    const entities: Entity[] = [];
    const components: BenchmarkComponent[][] = [];
    const rng = new SeededRandom(42);

    for (let i = 0; i < count; i++) {
        entities.push(i);
        const entityComponents: BenchmarkComponent[] = [];

        const componentTypes = Object.values(T).slice(0, componentCount);
        for (const componentType of componentTypes) {
            entityComponents.push(createRandomComponent(componentType, rng));
        }

        components.push(entityComponents);
    }

    return { entities, components };
}

/**
 * Create a distribution of entities with different component combinations
 */
export function createMixedComponentDistribution(world: World<BenchmarkComponent>, entityCount: number) {
    const entities: Entity[] = [];
    const rng = new SeededRandom(42);

    // 40% with Position + Velocity
    const group1Count = Math.floor(entityCount * 0.4);
    for (let i = 0; i < group1Count; i++) {
        const entity = world.createEntity();
        world.spawn(entity, [
            createPosition(rng.nextFloat(-1000, 1000), rng.nextFloat(-1000, 1000)),
            createVelocity(rng.nextFloat(-10, 10), rng.nextFloat(-10, 10)),
        ]);
        entities.push(entity);
    }

    // 30% with Position + Velocity + Sprite
    const group2Count = Math.floor(entityCount * 0.3);
    for (let i = 0; i < group2Count; i++) {
        const entity = world.createEntity();
        world.spawn(entity, [
            createPosition(rng.nextFloat(-1000, 1000), rng.nextFloat(-1000, 1000)),
            createVelocity(rng.nextFloat(-10, 10), rng.nextFloat(-10, 10)),
            createSprite(`texture_${rng.nextInt(0, 10)}`, rng.nextInt(0, 5)),
        ]);
        entities.push(entity);
    }

    // 20% with Position + Health + AI
    const group3Count = Math.floor(entityCount * 0.2);
    for (let i = 0; i < group3Count; i++) {
        const entity = world.createEntity();
        world.spawn(entity, [
            createPosition(rng.nextFloat(-1000, 1000), rng.nextFloat(-1000, 1000)),
            createHealth(rng.nextInt(50, 100), 100),
            createAI(['idle', 'patrol', 'chase'][rng.nextInt(0, 2)], null),
        ]);
        entities.push(entity);
    }

    // 10% with all components
    const group4Count = entityCount - group1Count - group2Count - group3Count;
    for (let i = 0; i < group4Count; i++) {
        const entity = world.createEntity();
        world.spawn(entity, [
            createPosition(rng.nextFloat(-1000, 1000), rng.nextFloat(-1000, 1000)),
            createVelocity(rng.nextFloat(-10, 10), rng.nextFloat(-10, 10)),
            createHealth(rng.nextInt(50, 100), 100),
            createSprite(`texture_${rng.nextInt(0, 10)}`, rng.nextInt(0, 5)),
            createCollider(rng.nextFloat(0.5, 5)),
        ]);
        entities.push(entity);
    }

    return entities;
}
